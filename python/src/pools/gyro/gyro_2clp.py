from dataclasses import dataclass
from typing import List

from src.common.maths import (
    Rounding,
    div_down_fixed,
    div_up,
    mul_down_fixed,
    mul_up_fixed,
)
from src.common.pool_base import PoolBase
from src.common.swap_params import SwapParams
from src.common.types import SwapKind
from src.common.utils import MAX_UINT256
from src.pools.gyro.gyro_2clp_data import Gyro2CLPState
from src.pools.gyro.gyro_2clp_math import (
    calc_in_given_out,
    calc_out_given_in,
    calculate_invariant,
    calculate_virtual_parameter0,
    calculate_virtual_parameter1,
)


@dataclass
class VirtualBalances:
    """Represents the virtual balances for a pool."""

    virtual_balance_in: int
    virtual_balance_out: int


class Gyro2CLP(PoolBase):
    def __init__(self, pool_state: Gyro2CLPState):
        if pool_state.sqrt_alpha >= pool_state.sqrt_beta:
            raise ValueError("SqrtParamsWrong")
        self.sqrt_alpha = pool_state.sqrt_alpha
        self.sqrt_beta = pool_state.sqrt_beta

    def get_maximum_invariant_ratio(self) -> int:
        return MAX_UINT256

    def get_minimum_invariant_ratio(self) -> int:
        return 0

    def on_swap(self, swap_params: SwapParams) -> int:
        token_in_is_token_0 = swap_params.index_in == 0
        balance_token_in_scaled18 = swap_params.balances_live_scaled18[
            swap_params.index_in
        ]
        balance_token_out_scaled18 = swap_params.balances_live_scaled18[
            swap_params.index_out
        ]

        virtual_balances = self.get_virtual_offsets(
            balance_token_in_scaled18,
            balance_token_out_scaled18,
            token_in_is_token_0,
            self.sqrt_alpha,
            self.sqrt_beta,
        )

        if swap_params.swap_kind.value == SwapKind.GIVENIN.value:
            return calc_out_given_in(
                balance_token_in_scaled18,
                balance_token_out_scaled18,
                swap_params.amount_given_scaled18,
                virtual_balances.virtual_balance_in,
                virtual_balances.virtual_balance_out,
            )

        return calc_in_given_out(
            balance_token_in_scaled18,
            balance_token_out_scaled18,
            swap_params.amount_given_scaled18,
            virtual_balances.virtual_balance_in,
            virtual_balances.virtual_balance_out,
        )

    def compute_invariant(
        self, balances_live_scaled18: List[int], rounding: Rounding
    ) -> int:
        return calculate_invariant(
            balances_live_scaled18,
            self.sqrt_alpha,
            self.sqrt_beta,
            rounding,
        )

    def compute_balance(
        self,
        balances_live_scaled18: List[int],
        token_in_index: int,
        invariant_ratio: int,
    ) -> int:
        """
        /**********************************************************************************************
        // Gyro invariant formula is:
        //                                    Lˆ2 = (x + a)(y + b)
        // where:
        //   a = L / _sqrtBeta
        //   b = L * _sqrtAlpha
        //
        // In computeBalance, we want to know the new balance of a token, given that the invariant
        // changed and the other token balance didn't change. To calculate that for "x", we use:
        //
        //            (L*Lratio)ˆ2 = (newX + (L*Lratio) / _sqrtBeta)(y + (L*Lratio) * _sqrtAlpha)
        //
        // To simplify, let's rename a few terms:
        //
        //                                       squareNewInv = (newX + a)(y + b)
        //
        // Isolating newX:                       newX = (squareNewInv/(y + b)) - a
        // For newY:                             newY = (squareNewInv/(x + a)) - b
        **********************************************************************************************/
        """

        # // `computeBalance` is used to calculate unbalanced adds and removes, when the BPT value is specified.
        # // A bigger invariant in `computeAddLiquiditySingleTokenExactOut` means that more tokens are required to
        # // fulfill the trade, and a bigger invariant in `computeRemoveLiquiditySingleTokenExactIn` means that the
        # // amount out is lower. So, the invariant should always be rounded up.
        invariant = calculate_invariant(
            balances_live_scaled18,
            self.sqrt_alpha,
            self.sqrt_beta,
            Rounding.ROUND_UP,
        )

        # // New invariant
        invariant = mul_up_fixed(invariant, invariant_ratio)
        square_new_inv = invariant * invariant
        # // L / sqrt(beta)
        a = div_down_fixed(invariant, self.sqrt_beta)
        # // L * sqrt(alpha)
        b = mul_down_fixed(invariant, self.sqrt_alpha)

        new_balance = 0
        if token_in_index == 0:
            # // if newBalance = newX
            new_balance = div_up(square_new_inv, balances_live_scaled18[1] + b) - a
        else:
            # // if newBalance = newY
            new_balance = div_up(square_new_inv, balances_live_scaled18[0] + a) - b

        return new_balance

    def get_virtual_offsets(
        self,
        balance_token_in_scaled18: int,
        balance_token_out_scaled18: int,
        token_in_is_token0: bool,
        _sqrt_alpha: int,
        _sqrt_beta: int,
    ) -> VirtualBalances:
        """
        Calculate virtual offsets for token balances.

        virtualBalanceIn is always rounded up, because:
        * If swap is EXACT_IN: a bigger virtualBalanceIn leads to a lower amount out
        * If swap is EXACT_OUT: a bigger virtualBalanceIn leads to a bigger amount in

        virtualBalanceOut is always rounded down, because:
        * If swap is EXACT_IN: a lower virtualBalanceOut leads to a lower amount out
        * If swap is EXACT_OUT: a lower virtualBalanceOut leads to a bigger amount in

        Args:
            balance_token_in_scaled18: Input token balance scaled to 18 decimals
            balance_token_out_scaled18: Output token balance scaled to 18 decimals
            token_in_is_token0: Whether input token is token0
            _sqrt_alpha: Square root of alpha parameter
            _sqrt_beta: Square root of beta parameter

        Returns:
            VirtualBalances object containing virtualBalanceIn and virtualBalanceOut
        """
        # Initialize balances array
        balances = [0, 0]
        balances[0] = (
            balance_token_in_scaled18
            if token_in_is_token0
            else balance_token_out_scaled18
        )
        balances[1] = (
            balance_token_out_scaled18
            if token_in_is_token0
            else balance_token_in_scaled18
        )

        # Calculate current invariant
        current_invariant = calculate_invariant(
            balances, _sqrt_alpha, _sqrt_beta, Rounding.ROUND_DOWN
        )

        # Calculate virtual balances based on token position
        if token_in_is_token0:
            virtual_balance_in = calculate_virtual_parameter0(
                current_invariant, _sqrt_beta, Rounding.ROUND_UP
            )
            virtual_balance_out = calculate_virtual_parameter1(
                current_invariant, _sqrt_alpha, Rounding.ROUND_DOWN
            )
        else:
            virtual_balance_in = calculate_virtual_parameter1(
                current_invariant, _sqrt_alpha, Rounding.ROUND_UP
            )
            virtual_balance_out = calculate_virtual_parameter0(
                current_invariant, _sqrt_beta, Rounding.ROUND_DOWN
            )

        return VirtualBalances(
            virtual_balance_in=virtual_balance_in,
            virtual_balance_out=virtual_balance_out,
        )

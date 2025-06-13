from typing import List

from src.common.maths import Rounding
from src.common.pool_base import PoolBase
from src.common.swap_params import SwapParams
from src.common.types import SwapKind
from src.pools.reclamm.reclamm_data import ReClammState
from src.pools.reclamm.reclamm_math import (
    compute_current_virtual_balances,
    compute_out_given_in,
    compute_in_given_out,
    compute_centeredness,
)


class ReClamm(PoolBase):
    MIN_TOKEN_BALANCE_SCALED18 = 1_000_000_000_000
    MIN_POOL_CENTEREDNESS = 1_000

    def __init__(self, pool_state: ReClammState):
        self.re_clamm_state = pool_state

    def get_maximum_invariant_ratio(self) -> int:
        # The invariant ratio bounds are required by `IBasePool`, but are unused in this pool type, as liquidity can
        # only be added or removed proportionally.
        return 0

    def get_minimum_invariant_ratio(self) -> int:
        # The invariant ratio bounds are required by `IBasePool`, but are unused in this pool type, as liquidity can
        # only be added or removed proportionally.
        return 0

    def on_swap(self, swap_params: SwapParams) -> int:
        compute_result = self._compute_current_virtual_balances(
            swap_params.balances_live_scaled18
        )

        if swap_params.swap_kind.value == SwapKind.GIVENIN.value:
            amount_calculated_scaled_18 = compute_out_given_in(
                swap_params.balances_live_scaled18,
                compute_result[0],  # current_virtual_balance_a
                compute_result[1],  # current_virtual_balance_b
                swap_params.index_in,
                swap_params.index_out,
                swap_params.amount_given_scaled18,
            )

            self._ensure_valid_pool_state_after_swap(
                swap_params.balances_live_scaled18,
                compute_result[0],  # current_virtual_balance_a
                compute_result[1],  # current_virtual_balance_b
                swap_params.amount_given_scaled18,
                amount_calculated_scaled_18,
                swap_params.index_in,
                swap_params.index_out,
            )

            return amount_calculated_scaled_18

        amount_calculated_scaled_18 = compute_in_given_out(
            swap_params.balances_live_scaled18,
            compute_result[0],  # current_virtual_balance_a
            compute_result[1],  # current_virtual_balance_b
            swap_params.index_in,
            swap_params.index_out,
            swap_params.amount_given_scaled18,
        )

        self._ensure_valid_pool_state_after_swap(
            swap_params.balances_live_scaled18,
            compute_result[0],  # current_virtual_balance_a
            compute_result[1],  # current_virtual_balance_b
            amount_calculated_scaled_18,
            swap_params.amount_given_scaled18,
            swap_params.index_in,
            swap_params.index_out,
        )

        return amount_calculated_scaled_18

    def compute_invariant(
        self, balances_live_scaled18: List[int], rounding: Rounding
    ) -> int:
        # Only needed for unbalanced liquidity and thats not possible in this pool
        return 0

    def compute_balance(
        self,
        balances_live_scaled18: List[int],
        token_in_index: int,
        invariant_ratio: int,
    ) -> int:
        # Only needed for unbalanced liquidity and thats not possible in this pool
        return 0

    def _compute_current_virtual_balances(
        self, balances_scaled_18: List[int]
    ) -> tuple[int, int, bool]:
        return compute_current_virtual_balances(
            self.re_clamm_state.current_timestamp,
            balances_scaled_18,
            self.re_clamm_state.last_virtual_balances[0],
            self.re_clamm_state.last_virtual_balances[1],
            self.re_clamm_state.daily_price_shift_base,
            self.re_clamm_state.last_timestamp,
            self.re_clamm_state.centeredness_margin,
            self.re_clamm_state.start_fourth_root_price_ratio,
            self.re_clamm_state.end_fourth_root_price_ratio,
            self.re_clamm_state.price_ratio_update_start_time,
            self.re_clamm_state.price_ratio_update_end_time,
        )

    def _ensure_valid_pool_state_after_swap(
        self,
        current_balances_scaled_18: List[int],
        current_virtual_balance_a: int,
        current_virtual_balance_b: int,
        amount_in_scaled_18: int,
        amount_out_scaled_18: int,
        index_in: int,
        index_out: int,
    ) -> None:
        # Create a copy of the balances array
        updated_balances = current_balances_scaled_18.copy()
        updated_balances[index_in] += amount_in_scaled_18
        # The swap functions `computeOutGivenIn` and `computeInGivenOut` ensure that the amountOutScaled18 is
        # never greater than the balance of the token being swapped out. Therefore, the math below will never
        # underflow. Nevertheless, since these considerations involve code outside this function, it is safest
        # to still use checked math here.
        updated_balances[index_out] -= amount_out_scaled_18

        if updated_balances[index_out] < self.MIN_TOKEN_BALANCE_SCALED18:
            # If one of the token balances is below the minimum, the price ratio update is unreliable.
            raise ValueError("reClammPool: TokenBalanceTooLow")

        if (
            compute_centeredness(
                updated_balances,
                current_virtual_balance_a,
                current_virtual_balance_b,
            )
            < self.MIN_POOL_CENTEREDNESS
        ):
            # If the pool centeredness is below the minimum, the price ratio update is unreliable.
            raise ValueError("reClammPool: PoolCenterednessTooLow")

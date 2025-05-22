from typing import List
from src.swap import SwapKind
from src.pools.reclamm.reclamm_data import ReClammMutable, PriceRatioState
from src.pools.reclamm.reclamm_math import (
    compute_current_virtual_balances,
    compute_out_given_in,
    compute_in_given_out,
    compute_centeredness,
)


class ReClamm:
    MIN_TOKEN_BALANCE_SCALED18 = 1_000_000_000_000
    MIN_POOL_CENTEREDNESS = 1_000

    def __init__(self, pool_state):
        re_clamm_state = ReClammMutable(
            lastVirtualBalances=pool_state["lastVirtualBalances"],
            dailyPriceShiftBase=pool_state["dailyPriceShiftBase"],
            lastTimestamp=pool_state["lastTimestamp"],
            currentTimestamp=pool_state["currentTimestamp"],
            centerednessMargin=pool_state["centerednessMargin"],
            priceRatioState=PriceRatioState(
                startFourthRootPriceRatio=pool_state["startFourthRootPriceRatio"],
                endFourthRootPriceRatio=pool_state["endFourthRootPriceRatio"],
                priceRatioUpdateStartTime=pool_state["priceRatioUpdateStartTime"],
                priceRatioUpdateEndTime=pool_state["priceRatioUpdateEndTime"],
            ),
        )
        self.re_clamm_state = re_clamm_state

    def get_maximum_invariant_ratio(self) -> int:
        # The invariant ratio bounds are required by `IBasePool`, but are unused in this pool type, as liquidity can
        # only be added or removed proportionally.
        return 0

    def get_minimum_invariant_ratio(self) -> int:
        # The invariant ratio bounds are required by `IBasePool`, but are unused in this pool type, as liquidity can
        # only be added or removed proportionally.
        return 0

    # TODO: this is not yet implemented in the vault (use TS as reference)
    def get_max_swap_amount(
        self,
        balances_live_scaled_18: List[int],
        index_in: int,
        index_out: int,
        swap_kind: str,
    ) -> int:
        max_amount_out = (
            balances_live_scaled_18[index_out] - self.MIN_TOKEN_BALANCE_SCALED18
        )

        if swap_kind == SwapKind.GIVENIN.value:
            # ComputeInGivenOut, where the amount out is the real balance of the token out - 1e12 (1e12 is the minimum amount of token in this pool).
            # This would give the maximum amount in.
            compute_result = self._compute_current_virtual_balances(
                balances_live_scaled_18
            )
            amount_calculated_scaled_18 = compute_in_given_out(
                balances_live_scaled_18,
                compute_result[0],  # current_virtual_balance_a
                compute_result[1],  # current_virtual_balance_b
                index_in,
                index_out,
                max_amount_out,
            )
            return amount_calculated_scaled_18 - 1
        return max_amount_out

    def get_max_single_token_add_amount(self) -> int:
        # liquidity can only be added or removed proportionally.
        return 0

    def get_max_single_token_remove_amount(self) -> int:
        # liquidity can only be added or removed proportionally.
        return 0

    # TODO: refactor swapParams as a class
    def on_swap(self, swap_params: dict) -> int:
        compute_result = self._compute_current_virtual_balances(
            swap_params["balances_live_scaled18"]
        )

        if swap_params["swap_kind"] == SwapKind.GIVENIN.value:
            amount_calculated_scaled_18 = compute_out_given_in(
                swap_params["balances_live_scaled18"],
                compute_result[0],  # current_virtual_balance_a
                compute_result[1],  # current_virtual_balance_b
                swap_params["index_in"],
                swap_params["index_out"],
                swap_params["amount_given_scaled18"],
            )

            self._ensure_valid_pool_state_after_swap(
                swap_params["balances_live_scaled18"],
                compute_result[0],  # current_virtual_balance_a
                compute_result[1],  # current_virtual_balance_b
                swap_params["amount_given_scaled18"],
                amount_calculated_scaled_18,
                swap_params["index_in"],
                swap_params["index_out"],
            )

            return amount_calculated_scaled_18

        amount_calculated_scaled_18 = compute_in_given_out(
            swap_params["balances_live_scaled18"],
            compute_result[0],  # current_virtual_balance_a
            compute_result[1],  # current_virtual_balance_b
            swap_params["index_in"],
            swap_params["index_out"],
            swap_params["amount_given_scaled18"],
        )

        self._ensure_valid_pool_state_after_swap(
            swap_params["balances_live_scaled18"],
            compute_result[0],  # current_virtual_balance_a
            compute_result[1],  # current_virtual_balance_b
            amount_calculated_scaled_18,
            swap_params["amount_given_scaled18"],
            swap_params["index_in"],
            swap_params["index_out"],
        )

        return amount_calculated_scaled_18

    def compute_invariant(self) -> int:
        # Only needed for unbalanced liquidity and thats not possible in this pool
        return 0

    def compute_balance(self) -> int:
        # Only needed for unbalanced liquidity and thats not possible in this pool
        return 0

    def _compute_current_virtual_balances(
        self, balances_scaled_18: List[int]
    ) -> tuple[int, int, bool]:
        return compute_current_virtual_balances(
            self.re_clamm_state.currentTimestamp,
            balances_scaled_18,
            self.re_clamm_state.lastVirtualBalances[0],
            self.re_clamm_state.lastVirtualBalances[1],
            self.re_clamm_state.dailyPriceShiftBase,
            self.re_clamm_state.lastTimestamp,
            self.re_clamm_state.centerednessMargin,
            self.re_clamm_state.priceRatioState,
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

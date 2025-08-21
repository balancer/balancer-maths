from typing import List

from src.common.maths import Rounding
from src.common.pool_base import PoolBase
from src.common.swap_params import SwapParams
from src.common.types import SwapKind
from src.pools.reclamm_v2.reclamm_v2_data import ReClammV2State
from src.pools.reclamm_v2.reclamm_v2_math import (
    compute_current_virtual_balances,
    compute_in_given_out,
    compute_out_given_in,
)


class ReClammV2(PoolBase):

    def __init__(self, pool_state: ReClammV2State):
        self.re_clamm_v2_state = pool_state

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

            return amount_calculated_scaled_18

        amount_calculated_scaled_18 = compute_in_given_out(
            swap_params.balances_live_scaled18,
            compute_result[0],  # current_virtual_balance_a
            compute_result[1],  # current_virtual_balance_b
            swap_params.index_in,
            swap_params.index_out,
            swap_params.amount_given_scaled18,
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
            self.re_clamm_v2_state.current_timestamp,
            balances_scaled_18,
            self.re_clamm_v2_state.last_virtual_balances[0],
            self.re_clamm_v2_state.last_virtual_balances[1],
            self.re_clamm_v2_state.daily_price_shift_base,
            self.re_clamm_v2_state.last_timestamp,
            self.re_clamm_v2_state.centeredness_margin,
            self.re_clamm_v2_state.start_fourth_root_price_ratio,
            self.re_clamm_v2_state.end_fourth_root_price_ratio,
            self.re_clamm_v2_state.price_ratio_update_start_time,
            self.re_clamm_v2_state.price_ratio_update_end_time,
        )

from typing import List

from src.common.maths import complement_fixed, div_down_fixed, mul_down_fixed
from src.common.swap_params import SwapParams
from src.common.types import SwapKind
from src.hooks.default_hook import DefaultHook
from src.hooks.stable_surge.types import StableSurgeHookState
from src.hooks.types import DynamicSwapFeeResult
from src.pools.stable.stable import Stable
from src.pools.stable.stable_data import StableMutable


# This hook implements the StableSurgeHook found in mono-repo: https://github.com/balancer/balancer-v3-monorepo/blob/main/pkg/pool-hooks/contracts/StableSurgeHook.sol
class StableSurgeHook(DefaultHook):
    should_call_compute_dynamic_swap_fee = True

    def on_compute_dynamic_swap_fee(
        self,
        swap_params: SwapParams,
        static_swap_fee_percentage: int,
        hook_state: StableSurgeHookState | object | None,
    ) -> DynamicSwapFeeResult:
        if not isinstance(hook_state, StableSurgeHookState):
            return DynamicSwapFeeResult(success=False, dynamic_swap_fee=0)

        stable_state = StableMutable(amp=hook_state.amp)
        stable_pool = Stable(stable_state)

        return DynamicSwapFeeResult(
            success=True,
            dynamic_swap_fee=self.get_surge_fee_percentage(
                swap_params,
                stable_pool,
                hook_state.surge_threshold_percentage,
                hook_state.max_surge_fee_percentage,
                static_swap_fee_percentage,
            ),
        )

    def get_surge_fee_percentage(
        self,
        swap_params: SwapParams,
        pool: Stable,
        surge_threshold_percentage: int,
        max_surge_fee_percentage: int,
        static_fee_percentage: int,
    ) -> int:
        amount_calculated_scaled_18 = pool.on_swap(swap_params)
        new_balances = swap_params.balances_live_scaled18[:]

        if swap_params.swap_kind.value == SwapKind.GIVENIN.value:
            new_balances[swap_params.index_in] += swap_params.amount_given_scaled18
            new_balances[swap_params.index_out] -= amount_calculated_scaled_18
        else:
            new_balances[swap_params.index_in] += amount_calculated_scaled_18
            new_balances[swap_params.index_out] -= swap_params.amount_given_scaled18

        new_total_imbalance = self.calculate_imbalance(new_balances)

        if new_total_imbalance == 0:
            return static_fee_percentage

        old_total_imbalance = self.calculate_imbalance(
            swap_params.balances_live_scaled18
        )

        if (
            new_total_imbalance <= old_total_imbalance
            or new_total_imbalance <= surge_threshold_percentage
        ):
            return static_fee_percentage

        dynamic_swap_fee = static_fee_percentage + mul_down_fixed(
            max_surge_fee_percentage - static_fee_percentage,
            div_down_fixed(
                new_total_imbalance - surge_threshold_percentage,
                complement_fixed(surge_threshold_percentage),
            ),
        )
        return dynamic_swap_fee

    def calculate_imbalance(self, balances: List[int]) -> int:
        median = self.find_median(balances)

        total_balance = sum(balances)
        total_diff = sum(self.abs_sub(balance, median) for balance in balances)

        return div_down_fixed(total_diff, total_balance)

    def find_median(self, balances: List[int]) -> int:
        sorted_balances = sorted(balances)
        mid = len(sorted_balances) // 2

        if len(sorted_balances) % 2 == 0:
            return (sorted_balances[mid - 1] + sorted_balances[mid]) // 2
        else:
            return sorted_balances[mid]

    def abs_sub(self, a: int, b: int) -> int:
        return abs(a - b)

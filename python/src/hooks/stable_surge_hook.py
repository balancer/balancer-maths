from typing import Dict, List

from src.maths import (
    div_down_fixed,
    mul_down_fixed,
    complement_fixed,
)
from src.pools.stable import Stable
from src.swap import SwapKind


# This hook implements the StableSurgeHook found in mono-repo: https://github.com/balancer/balancer-v3-monorepo/blob/main/pkg/pool-hooks/contracts/StableSurgeHook.sol
class StableSurgeHook:
    def __init__(self):
        self.should_call_compute_dynamic_swap_fee = True
        self.should_call_before_swap = False
        self.should_call_after_swap = False
        self.should_call_before_add_liquidity = False
        self.should_call_after_add_liquidity = False
        self.should_call_before_remove_liquidity = False
        self.should_call_after_remove_liquidity = False
        self.enable_hook_adjusted_amounts = False

    def on_before_add_liquidity(self):
        return {"success": False, "hook_adjusted_balances_scaled18": []}

    def on_after_add_liquidity(self):
        return {"success": False, "hook_adjusted_amounts_in_raw": []}

    def on_before_remove_liquidity(self):
        return {"success": False, "hook_adjusted_balances_scaled18": []}

    def on_after_remove_liquidity(self):
        return {"success": False, "hook_adjusted_amounts_out_raw": []}

    def on_before_swap(self):
        return {"success": False, "hook_adjusted_balances_scaled18": []}

    def on_after_swap(self):
        return {"success": False, "hook_adjusted_amount_calculated_raw": 0}

    def on_compute_dynamic_swap_fee(
        self,
        params: Dict,
        static_swap_fee_percentage: int,
        hook_state: Dict,
    ) -> Dict[str, int]:
        stable_pool = Stable(hook_state)

        return {
            "success": True,
            "dynamic_swap_fee": self.get_surge_fee_percentage(
                params,
                stable_pool,
                hook_state["surgeThresholdPercentage"],
                hook_state["maxSurgeFeePercentage"],
                static_swap_fee_percentage,
            ),
        }

    def get_surge_fee_percentage(
        self,
        params: Dict,
        pool: Stable,
        surge_threshold_percentage: int,
        max_surge_fee_percentage: int,
        static_fee_percentage: int,
    ) -> int:
        amount_calculated_scaled_18 = pool.on_swap(params)
        new_balances = params["balances_live_scaled18"][:]

        if params["swap_kind"] == SwapKind.GIVENIN.value:
            new_balances[params["index_in"]] += params["amount_given_scaled18"]
            new_balances[params["index_out"]] -= amount_calculated_scaled_18
        else:
            new_balances[params["index_in"]] += amount_calculated_scaled_18
            new_balances[params["index_out"]] -= params["amount_given_scaled18"]

        new_total_imbalance = self.calculate_imbalance(new_balances)

        if new_total_imbalance == 0:
            return static_fee_percentage

        old_total_imbalance = self.calculate_imbalance(params["balances_live_scaled18"])

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

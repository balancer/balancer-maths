from typing import List

from src.common.maths import Rounding, div_down_fixed, mul_down_fixed, mul_up_fixed
from src.common.pool_base import PoolBase
from src.common.swap_params import SwapParams
from src.common.types import SwapKind
from src.pools.fixed_price_lbp.fixed_price_lbp_data import FixedPriceLBPState

MAX_UINT256 = 2**256 - 1


class FixedPriceLBP(PoolBase):
    def __init__(self, pool_state: FixedPriceLBPState):
        self.project_token_index = pool_state.project_token_index
        self.reserve_token_index = pool_state.reserve_token_index
        self.project_token_rate = pool_state.project_token_rate
        self.is_swap_enabled = pool_state.is_swap_enabled

    def get_maximum_invariant_ratio(self) -> int:
        return MAX_UINT256

    def get_minimum_invariant_ratio(self) -> int:
        return 0

    def on_swap(self, swap_params: SwapParams) -> int:
        if not self.is_swap_enabled:
            raise ValueError("SwapsDisabled")

        if swap_params.index_in == self.project_token_index:
            raise ValueError("SwapOfProjectTokenIn")

        if swap_params.swap_kind.value == SwapKind.GIVENIN.value:
            # Reserve tokens in, project tokens out: amountOut = amountIn / rate
            return div_down_fixed(
                swap_params.amount_given_scaled18, self.project_token_rate
            )

        # ExactOut: amountIn = amountOut * rate
        return mul_up_fixed(swap_params.amount_given_scaled18, self.project_token_rate)

    def compute_invariant(
        self, balances_live_scaled18: List[int], rounding: Rounding
    ) -> int:
        # inv = projectBalance * rate + reserveBalance
        if rounding.value == Rounding.ROUND_UP.value:
            project_token_value = mul_up_fixed(
                balances_live_scaled18[self.project_token_index],
                self.project_token_rate,
            )
        else:
            project_token_value = mul_down_fixed(
                balances_live_scaled18[self.project_token_index],
                self.project_token_rate,
            )

        return project_token_value + balances_live_scaled18[self.reserve_token_index]

    def compute_balance(
        self,
        balances_live_scaled18: List[int],
        token_in_index: int,
        invariant_ratio: int,
    ) -> int:
        raise ValueError("UnsupportedOperation")

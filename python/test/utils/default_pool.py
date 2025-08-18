from typing import List

from src.common.maths import Rounding
from src.common.pool_base import PoolBase
from src.common.swap_params import SwapParams


class DefaultPool(PoolBase):
    def __init__(self, pool_state: dict):
        self.pool_state = pool_state

    def on_swap(self, swap_params: SwapParams) -> int:
        return 1

    def compute_invariant(
        self, balances_live_scaled18: List[int], rounding: Rounding
    ) -> int:
        return 1

    def compute_balance(
        self,
        balances_live_scaled18: List[int],
        token_in_index: int,
        invariant_ratio: int,
    ) -> int:
        return 1

    def get_maximum_invariant_ratio(self) -> int:
        return 1

    def get_minimum_invariant_ratio(self) -> int:
        return 1

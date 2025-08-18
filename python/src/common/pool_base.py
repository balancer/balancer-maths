from abc import ABC, abstractmethod
from typing import List

from src.common.base_pool_state import BasePoolState
from src.common.maths import Rounding
from src.common.swap_params import SwapParams


class PoolBase(ABC):
    @abstractmethod
    def __init__(self, pool_state: BasePoolState): ...

    @abstractmethod
    def on_swap(self, swap_params: SwapParams) -> int: ...

    @abstractmethod
    def compute_invariant(
        self, balances_live_scaled18: List[int], rounding: Rounding
    ) -> int: ...

    @abstractmethod
    def compute_balance(
        self,
        balances_live_scaled18: List[int],
        token_in_index: int,
        invariant_ratio: int,
    ) -> int: ...

    @abstractmethod
    def get_maximum_invariant_ratio(self) -> int: ...

    @abstractmethod
    def get_minimum_invariant_ratio(self) -> int: ...

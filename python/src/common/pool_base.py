from abc import ABC, abstractmethod
from typing import List

from src.common.maths import Rounding
from src.common.swap_params import SwapParams


class PoolBase(ABC):
    """Base interface for all pool types.

    This abstract base class defines the interface that all pool implementations must follow.
    All methods must be implemented by concrete pool classes.
    """

    @abstractmethod
    def on_swap(self, swap_params: SwapParams) -> int:
        """Execute a swap operation."""
        pass

    @abstractmethod
    def compute_invariant(
        self, balances_live_scaled18: List[int], rounding: Rounding
    ) -> int:
        """Compute the pool's invariant."""
        pass

    @abstractmethod
    def compute_balance(
        self,
        balances_live_scaled18: List[int],
        token_in_index: int,
        invariant_ratio: int,
    ) -> int:
        """Compute the balance for a given token."""
        pass

    @abstractmethod
    def get_maximum_invariant_ratio(self) -> int:
        """Get the maximum allowed invariant ratio."""
        pass

    @abstractmethod
    def get_minimum_invariant_ratio(self) -> int:
        """Get the minimum allowed invariant ratio."""
        pass

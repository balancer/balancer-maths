from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import List, Optional, Union

from src.common.types import (
    AddLiquidityInput,
    AddLiquidityResult,
    RemoveLiquidityInput,
    RemoveLiquidityResult,
    SwapInput,
    SwapResult,
)


class ExecutionMode(Enum):
    """Execution mode for simulator operations."""

    COMMIT = "commit"  # Apply state changes
    SIMULATE = "simulate"  # Return result without state change


@dataclass
class SimulatorConfig:
    """Configuration for the pool simulator."""

    track_history: bool = True
    max_history_size: Optional[int] = None


@dataclass
class OperationRecord:
    """Record of a single operation in the simulator history."""

    sequence: int
    operation_type: str  # "swap", "add_liquidity", "remove_liquidity"
    input: Union[SwapInput, AddLiquidityInput, RemoveLiquidityInput]
    result: Union[SwapResult, AddLiquidityResult, RemoveLiquidityResult]
    was_committed: bool
    balances_before: List[int]
    balances_after: List[int]
    total_supply_before: int
    total_supply_after: int

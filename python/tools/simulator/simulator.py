"""Pool simulator for security analysis and sequential operation testing.

Provides a stateful wrapper around balancer-maths vault operations.
"""

from __future__ import annotations

import uuid
from copy import deepcopy
from typing import Dict, List, Optional

from src.common.types import (
    AddLiquidityInput,
    AddLiquidityResult,
    BufferState,
    PoolState,
    RemoveLiquidityInput,
    RemoveLiquidityResult,
    SwapInput,
    SwapResult,
)
from src.hooks.types import HookState
from src.vault.vault import Vault
from tools.simulator.types import ExecutionMode, OperationRecord, SimulatorConfig


class PoolSimulator:
    """Stateful wrapper for pool operations enabling security analysis.

    The simulator maintains pool state across operations and supports:
    - Sequential swaps, add/remove liquidity
    - COMMIT mode (apply state changes) vs SIMULATE mode (query only)
    - Snapshot/restore for state rollback
    - Operation history tracking
    """

    def __init__(
        self,
        initial_pool_state: PoolState,
        initial_hook_state: Optional[HookState] = None,
        config: Optional[SimulatorConfig] = None,
    ):
        """Initialize the pool simulator.

        Args:
            initial_pool_state: Starting pool state
            initial_hook_state: Starting hook state (if applicable)
            config: Simulator configuration
        """
        self._vault = Vault()
        self._initial_state = deepcopy(initial_pool_state)
        self._current_state = deepcopy(initial_pool_state)
        self._hook_state = deepcopy(initial_hook_state) if initial_hook_state else None
        self._history: List[OperationRecord] = []
        self._snapshots: Dict[str, PoolState] = {}
        self._config = config or SimulatorConfig()
        self._sequence_counter = 0

    # Core operations

    def swap(
        self, swap_input: SwapInput, mode: ExecutionMode = ExecutionMode.COMMIT
    ) -> SwapResult:
        """Execute a swap operation.

        Args:
            swap_input: Swap parameters
            mode: COMMIT to apply changes, SIMULATE to query only

        Returns:
            SwapResult with calculated amounts and updated state
        """
        result = self._vault.swap(
            swap_input=swap_input,
            pool_state=self._current_state,
            hook_state=self._hook_state,
        )

        if mode == ExecutionMode.COMMIT:
            self._record_operation(
                operation_type="swap",
                input_data=swap_input,
                result=result,
                was_committed=True,
            )
            assert not isinstance(
                result.updated_pool_state, BufferState
            ), "Simulator does not support buffer pools"
            self._current_state = result.updated_pool_state
        else:
            self._record_operation(
                operation_type="swap",
                input_data=swap_input,
                result=result,
                was_committed=False,
            )

        return result

    def add_liquidity(
        self,
        add_liquidity_input: AddLiquidityInput,
        mode: ExecutionMode = ExecutionMode.COMMIT,
    ) -> AddLiquidityResult:
        """Execute an add liquidity operation.

        Args:
            add_liquidity_input: Add liquidity parameters
            mode: COMMIT to apply changes, SIMULATE to query only

        Returns:
            AddLiquidityResult with calculated amounts and updated state
        """
        result = self._vault.add_liquidity(
            add_liquidity_input=add_liquidity_input,
            pool_state=self._current_state,
            hook_state=self._hook_state,
        )

        if mode == ExecutionMode.COMMIT:
            self._record_operation(
                operation_type="add_liquidity",
                input_data=add_liquidity_input,
                result=result,
                was_committed=True,
            )
            self._current_state = result.updated_pool_state
        else:
            self._record_operation(
                operation_type="add_liquidity",
                input_data=add_liquidity_input,
                result=result,
                was_committed=False,
            )

        return result

    def remove_liquidity(
        self,
        remove_liquidity_input: RemoveLiquidityInput,
        mode: ExecutionMode = ExecutionMode.COMMIT,
    ) -> RemoveLiquidityResult:
        """Execute a remove liquidity operation.

        Args:
            remove_liquidity_input: Remove liquidity parameters
            mode: COMMIT to apply changes, SIMULATE to query only

        Returns:
            RemoveLiquidityResult with calculated amounts and updated state
        """
        result = self._vault.remove_liquidity(
            remove_liquidity_input=remove_liquidity_input,
            pool_state=self._current_state,
            hook_state=self._hook_state,
        )

        if mode == ExecutionMode.COMMIT:
            self._record_operation(
                operation_type="remove_liquidity",
                input_data=remove_liquidity_input,
                result=result,
                was_committed=True,
            )
            self._current_state = result.updated_pool_state
        else:
            self._record_operation(
                operation_type="remove_liquidity",
                input_data=remove_liquidity_input,
                result=result,
                was_committed=False,
            )

        return result

    # State access

    @property
    def current_state(self) -> PoolState:
        """Get a copy of the current pool state.

        Returns:
            Deep copy of current pool state
        """
        return deepcopy(self._current_state)

    @property
    def initial_state(self) -> PoolState:
        """Get a copy of the initial pool state.

        Returns:
            Deep copy of initial pool state
        """
        return deepcopy(self._initial_state)

    # Snapshots

    def create_snapshot(self, name: Optional[str] = None) -> str:
        """Create a snapshot of the current state.

        Args:
            name: Optional name for the snapshot (UUID generated if not provided)

        Returns:
            Snapshot ID
        """
        snapshot_id = name or str(uuid.uuid4())
        self._snapshots[snapshot_id] = deepcopy(self._current_state)
        return snapshot_id

    def restore_snapshot(self, snapshot_id: str) -> None:
        """Restore state from a snapshot.

        Args:
            snapshot_id: ID of snapshot to restore

        Raises:
            KeyError: If snapshot_id does not exist
        """
        if snapshot_id not in self._snapshots:
            raise KeyError(f"Snapshot '{snapshot_id}' not found")
        self._current_state = deepcopy(self._snapshots[snapshot_id])

    def delete_snapshot(self, snapshot_id: str) -> None:
        """Delete a snapshot.

        Args:
            snapshot_id: ID of snapshot to delete

        Raises:
            KeyError: If snapshot_id does not exist
        """
        del self._snapshots[snapshot_id]

    def list_snapshots(self) -> List[str]:
        """List all snapshot IDs.

        Returns:
            List of snapshot IDs
        """
        return list(self._snapshots.keys())

    def reset(self) -> None:
        """Reset to initial state and clear history."""
        self._current_state = deepcopy(self._initial_state)
        self._history.clear()
        self._sequence_counter = 0

    # History

    def get_history(self) -> List[OperationRecord]:
        """Get operation history.

        Returns:
            List of operation records
        """
        return list(self._history)

    def clear_history(self) -> None:
        """Clear operation history."""
        self._history.clear()
        self._sequence_counter = 0

    # Internal methods

    def _record_operation(
        self,
        operation_type: str,
        input_data,
        result,
        was_committed: bool,
    ) -> None:
        """Record an operation in the history.

        Args:
            operation_type: Type of operation
            input_data: Operation input
            result: Operation result
            was_committed: Whether the operation was committed
        """
        if not self._config.track_history:
            return

        # Extract balances before operation
        balances_before = list(self._current_state.balances_live_scaled18)
        total_supply_before = self._current_state.total_supply

        # Extract balances after operation
        balances_after = list(result.updated_pool_state.balances_live_scaled18)
        total_supply_after = result.updated_pool_state.total_supply

        record = OperationRecord(
            sequence=self._sequence_counter,
            operation_type=operation_type,
            input=input_data,
            result=result,
            was_committed=was_committed,
            balances_before=balances_before,
            balances_after=balances_after,
            total_supply_before=total_supply_before,
            total_supply_after=total_supply_after,
        )

        self._history.append(record)
        self._sequence_counter += 1

        # Enforce max history size
        if (
            self._config.max_history_size is not None
            and len(self._history) > self._config.max_history_size
        ):
            self._history.pop(0)

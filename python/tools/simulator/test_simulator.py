"""Tests for the pool simulator."""

from copy import deepcopy
from test.utils.map_pool_state import transform_strings_to_ints
from test.utils.read_test_data import read_test_data
from simulator.utils import map_state

import pytest

from src.common.types import (
    AddLiquidityInput,
    AddLiquidityKind,
    RemoveLiquidityInput,
    RemoveLiquidityKind,
    SwapInput,
    SwapKind,
)
from tools.simulator import (
    ExecutionMode,
    PoolSimulator,
    SimulatorConfig,
    StateLoader,
)

# Load test data once for all tests
test_data = read_test_data()


class TestStateLoader:
    """Tests for StateLoader."""

    def test_from_pool_dict(self):
        """Test loading state from a pool dictionary."""
        # Use first available pool
        pool_name = list(test_data["pools"].keys())[0]
        pool_dict = test_data["pools"][pool_name]

        # Skip buffer pools
        if pool_dict.get("poolType") == "Buffer":
            pytest.skip("Buffer pools not supported")

        pool_state, _ = StateLoader.from_pool_dict(pool_dict)

        assert pool_state is not None
        assert pool_state.pool_address == pool_dict["poolAddress"]
        assert pool_state.pool_type == pool_dict["poolType"]
        assert len(pool_state.tokens) == len(pool_dict["tokens"])


class TestPoolSimulator:
    """Tests for PoolSimulator."""

    def _get_test_pool(self):
        """Get a test pool that supports all operations."""
        for pool_name, pool_dict in test_data["pools"].items():
            if pool_dict.get("poolType") != "Buffer":
                return pool_name, pool_dict
        raise ValueError("No suitable test pool found")

    def test_initialization(self):
        """Test simulator initialization."""
        _, pool_dict = self._get_test_pool()
        pool_state, hook_state = StateLoader.from_pool_dict(pool_dict)

        simulator = PoolSimulator(pool_state, hook_state)

        assert simulator.current_state.pool_address == pool_state.pool_address
        assert simulator.initial_state.pool_address == pool_state.pool_address

    def test_swap_commit_mode(self):
        """Test swap in COMMIT mode updates state."""
        # Find a swap test
        if not test_data["swaps"]:
            pytest.skip("No swap tests available")

        swap_test = test_data["swaps"][0]
        pool_name = swap_test["test"]
        pool_dict = test_data["pools"][pool_name]

        if pool_dict.get("poolType") == "Buffer":
            pytest.skip("Buffer pools handled separately")

        pool_with_ints = transform_strings_to_ints(pool_dict)
        pool_state, hook_state = map_state(pool_with_ints)

        simulator = PoolSimulator(pool_state, hook_state)
        initial_balances = list(simulator.current_state.balances_live_scaled18)

        # Execute swap in COMMIT mode
        swap_input = SwapInput(
            amount_raw=int(swap_test["amountRaw"]),
            swap_kind=SwapKind(swap_test["swapKind"]),
            token_in=swap_test["tokenIn"],
            token_out=swap_test["tokenOut"],
        )

        _ = simulator.swap(swap_input, mode=ExecutionMode.COMMIT)

        # State should be updated
        assert simulator.current_state.balances_live_scaled18 != initial_balances
        # History should contain one record
        assert len(simulator.get_history()) == 1
        assert simulator.get_history()[0].was_committed is True
        assert simulator.get_history()[0].operation_type == "swap"

    def test_swap_simulate_mode(self):
        """Test swap in SIMULATE mode does not update state."""
        if not test_data["swaps"]:
            pytest.skip("No swap tests available")

        swap_test = test_data["swaps"][0]
        pool_name = swap_test["test"]
        pool_dict = test_data["pools"][pool_name]

        if pool_dict.get("poolType") == "Buffer":
            pytest.skip("Buffer pools handled separately")

        pool_with_ints = transform_strings_to_ints(pool_dict)
        pool_state, hook_state = map_state(pool_with_ints)

        simulator = PoolSimulator(pool_state, hook_state)
        initial_balances = list(simulator.current_state.balances_live_scaled18)

        # Execute swap in SIMULATE mode
        swap_input = SwapInput(
            amount_raw=int(swap_test["amountRaw"]),
            swap_kind=SwapKind(swap_test["swapKind"]),
            token_in=swap_test["tokenIn"],
            token_out=swap_test["tokenOut"],
        )

        _ = simulator.swap(swap_input, mode=ExecutionMode.SIMULATE)

        # State should NOT be updated
        assert simulator.current_state.balances_live_scaled18 == initial_balances
        # History should contain one record
        assert len(simulator.get_history()) == 1
        assert simulator.get_history()[0].was_committed is False

    def test_add_liquidity_commit_mode(self):
        """Test add liquidity in COMMIT mode updates state."""
        if not test_data["adds"]:
            pytest.skip("No add liquidity tests available")

        add_test = test_data["adds"][0]
        pool_name = add_test["test"]
        pool_dict = test_data["pools"][pool_name]

        if pool_dict.get("poolType") == "Buffer":
            pytest.skip("Buffer pools do not support addLiquidity")

        pool_with_ints = transform_strings_to_ints(pool_dict)
        pool_state, hook_state = map_state(pool_with_ints)

        simulator = PoolSimulator(pool_state, hook_state)
        initial_total_supply = simulator.current_state.total_supply

        # Execute add liquidity
        add_input = AddLiquidityInput(
            pool=pool_dict["poolAddress"],
            max_amounts_in_raw=list(map(int, add_test["inputAmountsRaw"])),
            min_bpt_amount_out_raw=int(add_test["bptOutRaw"]),
            kind=AddLiquidityKind(add_test["kind"]),
        )

        _ = simulator.add_liquidity(add_input, mode=ExecutionMode.COMMIT)

        # Total supply should increase
        assert simulator.current_state.total_supply > initial_total_supply
        # History should contain one record
        assert len(simulator.get_history()) == 1
        assert simulator.get_history()[0].was_committed is True
        assert simulator.get_history()[0].operation_type == "add_liquidity"

    def test_remove_liquidity_commit_mode(self):
        """Test remove liquidity in COMMIT mode updates state."""
        if not test_data["removes"]:
            pytest.skip("No remove liquidity tests available")

        remove_test = test_data["removes"][0]
        pool_name = remove_test["test"]
        pool_dict = test_data["pools"][pool_name]

        if pool_dict.get("poolType") == "Buffer":
            pytest.skip("Buffer pools do not support removeLiquidity")

        pool_with_ints = transform_strings_to_ints(pool_dict)
        pool_state, hook_state = map_state(pool_with_ints)

        simulator = PoolSimulator(pool_state, hook_state)
        initial_total_supply = simulator.current_state.total_supply

        # Execute remove liquidity
        remove_input = RemoveLiquidityInput(
            pool=pool_dict["poolAddress"],
            min_amounts_out_raw=list(map(int, remove_test["amountsOutRaw"])),
            max_bpt_amount_in_raw=int(remove_test["bptInRaw"]),
            kind=RemoveLiquidityKind(remove_test["kind"]),
        )

        _ = simulator.remove_liquidity(remove_input, mode=ExecutionMode.COMMIT)

        # Total supply should decrease
        assert simulator.current_state.total_supply < initial_total_supply
        # History should contain one record
        assert len(simulator.get_history()) == 1
        assert simulator.get_history()[0].was_committed is True
        assert simulator.get_history()[0].operation_type == "remove_liquidity"

    def test_snapshot_and_restore(self):
        """Test snapshot and restore functionality."""
        if not test_data["swaps"]:
            pytest.skip("No swap tests available")

        swap_test = test_data["swaps"][0]
        pool_name = swap_test["test"]
        pool_dict = test_data["pools"][pool_name]

        if pool_dict.get("poolType") == "Buffer":
            pytest.skip("Buffer pools handled separately")

        pool_with_ints = transform_strings_to_ints(pool_dict)
        pool_state, hook_state = map_state(pool_with_ints)

        simulator = PoolSimulator(pool_state, hook_state)

        # Create snapshot
        snapshot_id = simulator.create_snapshot("before_swap")
        initial_balances = deepcopy(simulator.current_state.balances_live_scaled18)

        # Execute swap
        swap_input = SwapInput(
            amount_raw=int(swap_test["amountRaw"]),
            swap_kind=SwapKind(swap_test["swapKind"]),
            token_in=swap_test["tokenIn"],
            token_out=swap_test["tokenOut"],
        )
        simulator.swap(swap_input, mode=ExecutionMode.COMMIT)

        # Balances should have changed
        assert simulator.current_state.balances_live_scaled18 != initial_balances

        # Restore snapshot
        simulator.restore_snapshot(snapshot_id)

        # Balances should be back to initial
        assert simulator.current_state.balances_live_scaled18 == initial_balances

    def test_list_snapshots(self):
        """Test listing snapshots."""
        _, pool_dict = self._get_test_pool()
        pool_state, hook_state = StateLoader.from_pool_dict(pool_dict)

        simulator = PoolSimulator(pool_state, hook_state)

        # Initially no snapshots
        assert len(simulator.list_snapshots()) == 0

        # Create snapshots
        _ = simulator.create_snapshot("snapshot1")
        _ = simulator.create_snapshot("snapshot2")

        # Should have 2 snapshots
        snapshots = simulator.list_snapshots()
        assert len(snapshots) == 2
        assert "snapshot1" in snapshots
        assert "snapshot2" in snapshots

    def test_delete_snapshot(self):
        """Test deleting a snapshot."""
        _, pool_dict = self._get_test_pool()
        pool_state, hook_state = StateLoader.from_pool_dict(pool_dict)

        simulator = PoolSimulator(pool_state, hook_state)

        # Create and delete snapshot
        snapshot_id = simulator.create_snapshot("test")
        assert snapshot_id in simulator.list_snapshots()

        simulator.delete_snapshot(snapshot_id)
        assert snapshot_id not in simulator.list_snapshots()

    def test_reset(self):
        """Test reset functionality."""
        if not test_data["swaps"]:
            pytest.skip("No swap tests available")

        swap_test = test_data["swaps"][0]
        pool_name = swap_test["test"]
        pool_dict = test_data["pools"][pool_name]

        if pool_dict.get("poolType") == "Buffer":
            pytest.skip("Buffer pools handled separately")

        pool_with_ints = transform_strings_to_ints(pool_dict)
        pool_state, hook_state = map_state(pool_with_ints)

        simulator = PoolSimulator(pool_state, hook_state)
        initial_balances = deepcopy(simulator.current_state.balances_live_scaled18)

        # Execute swap
        swap_input = SwapInput(
            amount_raw=int(swap_test["amountRaw"]),
            swap_kind=SwapKind(swap_test["swapKind"]),
            token_in=swap_test["tokenIn"],
            token_out=swap_test["tokenOut"],
        )
        simulator.swap(swap_input, mode=ExecutionMode.COMMIT)

        # State should have changed
        assert simulator.current_state.balances_live_scaled18 != initial_balances
        assert len(simulator.get_history()) > 0

        # Reset
        simulator.reset()

        # State should be back to initial
        assert simulator.current_state.balances_live_scaled18 == initial_balances
        assert len(simulator.get_history()) == 0

    def test_clear_history(self):
        """Test clearing history."""
        if not test_data["swaps"]:
            pytest.skip("No swap tests available")

        swap_test = test_data["swaps"][0]
        pool_name = swap_test["test"]
        pool_dict = test_data["pools"][pool_name]

        if pool_dict.get("poolType") == "Buffer":
            pytest.skip("Buffer pools handled separately")

        pool_with_ints = transform_strings_to_ints(pool_dict)
        pool_state, hook_state = map_state(pool_with_ints)

        simulator = PoolSimulator(pool_state, hook_state)

        # Execute swap
        swap_input = SwapInput(
            amount_raw=int(swap_test["amountRaw"]),
            swap_kind=SwapKind(swap_test["swapKind"]),
            token_in=swap_test["tokenIn"],
            token_out=swap_test["tokenOut"],
        )
        simulator.swap(swap_input, mode=ExecutionMode.COMMIT)

        assert len(simulator.get_history()) > 0

        # Clear history
        simulator.clear_history()

        assert len(simulator.get_history()) == 0

    def test_history_disabled(self):
        """Test that history can be disabled."""
        pool_name, pool_dict = self._get_test_pool()
        pool_state, hook_state = StateLoader.from_pool_dict(pool_dict)

        # Create simulator with history disabled
        config = SimulatorConfig(track_history=False)
        simulator = PoolSimulator(pool_state, hook_state, config=config)

        # Find a swap test
        if not test_data["swaps"]:
            pytest.skip("No swap tests available")

        swap_test = next(
            (s for s in test_data["swaps"] if s["test"] == pool_name), None
        )
        if swap_test is None:
            pytest.skip("No swap test for this pool")

        # Execute swap
        swap_input = SwapInput(
            amount_raw=int(swap_test["amountRaw"]),
            swap_kind=SwapKind(swap_test["swapKind"]),
            token_in=swap_test["tokenIn"],
            token_out=swap_test["tokenOut"],
        )
        simulator.swap(swap_input, mode=ExecutionMode.COMMIT)

        # History should be empty
        assert len(simulator.get_history()) == 0

    def test_sequential_operations(self):
        """Test sequential operations maintain correct state."""
        if not test_data["swaps"]:
            pytest.skip("No swap tests available")

        swap_test = test_data["swaps"][0]
        pool_name = swap_test["test"]
        pool_dict = test_data["pools"][pool_name]

        if pool_dict.get("poolType") == "Buffer":
            pytest.skip("Buffer pools handled separately")

        pool_with_ints = transform_strings_to_ints(pool_dict)
        pool_state, hook_state = map_state(pool_with_ints)

        simulator = PoolSimulator(pool_state, hook_state)

        # Execute swap with smaller amount to avoid depleting pool
        # Use 10% of original amount to be safe
        small_amount = int(swap_test["amountRaw"]) // 10

        # Execute multiple swaps
        for i in range(3):
            swap_input = SwapInput(
                amount_raw=small_amount,
                swap_kind=SwapKind(swap_test["swapKind"]),
                token_in=swap_test["tokenIn"],
                token_out=swap_test["tokenOut"],
            )
            simulator.swap(swap_input, mode=ExecutionMode.COMMIT)

        # Should have 3 operations in history
        assert len(simulator.get_history()) == 3

        # Each operation should have different sequence numbers
        sequences = [op.sequence for op in simulator.get_history()]
        assert sequences == [0, 1, 2]

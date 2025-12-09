# Balancer Pool Simulator

A stateful security testing tool for Balancer V3 pools that enables sequential operation simulation and invariant tracking.

## Overview

The Pool Simulator provides a stateful wrapper around balancer-maths operations, designed specifically for security analysis and vulnerability testing. It supports:

- Sequential swaps, add/remove liquidity operations
- COMMIT vs SIMULATE execution modes
- State snapshots and rollback
- Operation history tracking
- Invariant monitoring across operations

## Quick Start

### Basic Usage

```python
from tools.simulator import PoolSimulator, StateLoader, ExecutionMode
from src.common.types import SwapInput, SwapKind

# Load pool state from testData JSON
pool_state, hook_state = StateLoader.from_json_file("path/to/pool.json")

# Initialize simulator
simulator = PoolSimulator(pool_state, hook_state)

# Execute a swap in COMMIT mode (applies state changes)
swap_input = SwapInput(
    amount_raw=1000000000000000000,  # 1.0 tokens (18 decimals)
    swap_kind=SwapKind.GIVENIN,
    token_in="0x...",
    token_out="0x..."
)
result = simulator.swap(swap_input, mode=ExecutionMode.COMMIT)

# Check current pool state
current_state = simulator.current_state
print(f"New balances: {current_state.balances_live_scaled18}")
```

### Execution Modes

**COMMIT Mode** - Applies state changes permanently:
```python
result = simulator.swap(swap_input, mode=ExecutionMode.COMMIT)
# State is updated after this call
```

**SIMULATE Mode** - Queries without mutating state:
```python
result = simulator.swap(swap_input, mode=ExecutionMode.SIMULATE)
# State remains unchanged, but result is calculated
```

### Snapshots & Rollback

Create snapshots to test exploit scenarios and rollback:

```python
# Create snapshot before potentially malicious operations
snapshot_id = simulator.create_snapshot("before_attack")

# Execute suspicious sequence
simulator.swap(...)
simulator.add_liquidity(...)

# Rollback if needed
simulator.restore_snapshot(snapshot_id)

# Or reset to initial state completely
simulator.reset()
```

### Operation History

Track all operations for analysis:

```python
history = simulator.get_history()
for op in history:
    print(f"Operation {op.sequence}: {op.operation_type}")
    print(f"  Committed: {op.was_committed}")
    print(f"  Balances before: {op.balances_before}")
    print(f"  Balances after: {op.balances_after}")
```

## Example: Fuzzing Script

Run the included fuzzing example to see invariant tracking across sequential swaps:

```bash
python3 -m tools.simulator.fuzz_example
```

This script demonstrates:
- Loading pool state from testData
- Executing 10 randomized swaps (5-20% of balance)
- Tracking invariant changes after each operation
- Detecting protocol violations (MaxInRatio)

### Sample Output

```
================================================================================
Balancer Pool Fuzzing Simulator - Invariant Tracking
================================================================================

Selected pool: 11155111-7439300-Weighted-USDC-DAI.json
Pool type: WEIGHTED

Initial Pool State:
  Tokens: 2
    Token 0: 6,916.38
    Token 1: 6,240.66
  Initial Invariant: 6,569.8399

Swap #1:
  Direction: Token 1 → Token 0
  Amount In:  511.37 (Token 1)
  Amount Out: 0.00 (Token 0)
  Balance In:  6,240.66 → 6,752.02
  Balance Out: 6,916.38 → 6,397.42
  Invariant Before: 6,569.8399
  Invariant After:  6,572.3292
  Invariant Change: 2.4893 (↑ 0.037889%)
```

## Security Testing Patterns

### Pattern 1: Invariant Manipulation Detection

```python
from src.pools.weighted.weighted_math import compute_invariant_down

# Calculate invariant before operation
invariant_before = compute_invariant_down(
    pool_state.weights, pool_state.balances_live_scaled18
)

# Execute suspicious operation
result = simulator.swap(..., mode=ExecutionMode.COMMIT)

# Check invariant after
invariant_after = compute_invariant_down(
    simulator.current_state.weights,
    simulator.current_state.balances_live_scaled18
)

# Invariant should only increase due to fees
if invariant_after < invariant_before:
    print("⚠️  INVARIANT DECREASED - POTENTIAL EXPLOIT")
```

### Pattern 2: Sandwich Attack Simulation

```python
# Front-run: Large swap in same direction
simulator.swap(SwapInput(...), mode=ExecutionMode.COMMIT)

# Victim transaction
snapshot = simulator.create_snapshot()
victim_result = simulator.swap(victim_swap_input, mode=ExecutionMode.COMMIT)

# Back-run: Reverse the initial swap
simulator.swap(reverse_swap_input, mode=ExecutionMode.COMMIT)

# Analyze profit
# ...then rollback to try other scenarios
simulator.restore_snapshot(snapshot)
```

### Pattern 3: Reentrancy Simulation

```python
# Simulate nested calls by manually orchestrating state
simulator.swap(initial_swap, mode=ExecutionMode.COMMIT)

# Before state is fully committed, simulate reentrant call
# (In practice, the protocol should prevent this)
reentrant_result = simulator.swap(reentrant_swap, mode=ExecutionMode.SIMULATE)

# Check if reentrant call would succeed with stale state
```

## API Reference

### PoolSimulator

#### Constructor
```python
PoolSimulator(
    initial_pool_state: PoolState,
    initial_hook_state: Optional[HookState] = None,
    config: Optional[SimulatorConfig] = None
)
```

#### Core Operations
- `swap(swap_input, mode=ExecutionMode.COMMIT) -> SwapResult`
- `add_liquidity(add_liquidity_input, mode=ExecutionMode.COMMIT) -> AddLiquidityResult`
- `remove_liquidity(remove_liquidity_input, mode=ExecutionMode.COMMIT) -> RemoveLiquidityResult`

#### State Management
- `current_state: PoolState` - Get current pool state (property)
- `initial_state: PoolState` - Get initial pool state (property)
- `reset()` - Reset to initial state and clear history

#### Snapshots
- `create_snapshot(name: Optional[str]) -> str` - Create state snapshot
- `restore_snapshot(snapshot_id: str)` - Restore from snapshot
- `delete_snapshot(snapshot_id: str)` - Delete snapshot
- `list_snapshots() -> List[str]` - List all snapshot IDs

#### History
- `get_history() -> List[OperationRecord]` - Get operation history
- `clear_history()` - Clear operation history

### StateLoader

#### Methods
- `from_json_file(filepath: str) -> Tuple[PoolState, Optional[HookState]]`
- `from_pool_dict(pool_dict: dict) -> Tuple[PoolState, Optional[HookState]]`

### SimulatorConfig

```python
@dataclass
class SimulatorConfig:
    track_history: bool = True
    max_history_size: Optional[int] = None
```

## Limitations

- **Buffer pools not supported** - Simulator only works with regular AMM pools (Weighted, Stable, etc.)
- **No flash loans** - Flash loan mechanics are not simulated
- **Hook simulation** - Hook state tracking is available but hooks must be implemented in balancer-maths
- **Block-based loading** - Direct blockchain state loading not yet implemented (use testData JSON files)

## Contributing

When adding new pool types or hooks, ensure they are compatible with the simulator by:
1. Implementing state update logic that returns new PoolState
2. Adding invariant calculation functions
3. Testing with the fuzzing script

## License

MIT

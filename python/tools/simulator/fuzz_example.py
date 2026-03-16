"""Example fuzzing script demonstrating invariant tracking across sequential swaps.

This script:
1. Loads the first non-buffer pool from testData
2. Performs 10 randomized swaps with amounts between 5-20% of current pool balances
3. Tracks and prints invariant changes after each swap
4. Note: Protocol enforces maximum 30% swap ratio relative to balance

Usage:
    python3 -m tools.simulator.fuzz_example
"""

import random
from test.utils.map_pool_state import transform_strings_to_ints

from src.common.types import SwapInput, SwapKind
from src.common.utils import _to_raw_undo_rate_round_down
from src.pools.stable.stable_data import StableState
from src.pools.stable.stable_math import compute_invariant as compute_stable_invariant
from src.pools.weighted.weighted_data import WeightedState
from src.pools.weighted.weighted_math import (
    compute_invariant_down as compute_weighted_invariant,
)
from tools.simulator import (
    ExecutionMode,
    PoolSimulator,
    StateLoader,
    read_simulation_data,
)


def calculate_invariant(pool_state):
    """Calculate invariant based on pool type."""
    if isinstance(pool_state, WeightedState):
        return compute_weighted_invariant(
            pool_state.weights, pool_state.balances_live_scaled18
        )
    elif isinstance(pool_state, StableState):
        return compute_stable_invariant(
            pool_state.amp, pool_state.balances_live_scaled18
        )
    else:
        # For other pool types, return sum of balances as a simple metric
        return sum(pool_state.balances_live_scaled18)


def format_balance(balance: int) -> str:
    """Format balance for display (convert from 18 decimals)."""
    return f"{balance / 1e18:,.2f}"


def format_invariant(invariant: int) -> str:
    """Format invariant for display."""
    return f"{invariant / 1e18:,.4f}"


def main():
    print("=" * 80)
    print("Balancer Pool Fuzzing Simulator - Invariant Tracking")
    print("=" * 80)
    print()

    # Load simulation data
    print("Loading simulation data...")
    pools = read_simulation_data()

    # Find first non-buffer pool
    pool_dict = None
    pool_name = None
    for name, pool in pools.items():
        if pool.get("poolType") != "Buffer":
            pool_dict = pool
            pool_name = name
            break

    if not pool_dict:
        print("ERROR: No suitable pool found in simulation data")
        return

    print(f"Selected pool: {pool_name}")
    print(f"Pool type: {pool_dict['poolType']}")
    print(f"Pool address: {pool_dict['poolAddress']}")
    print()

    # Load pool state
    pool_with_ints = transform_strings_to_ints(pool_dict)
    pool_state, hook_state = StateLoader.from_pool_dict(pool_with_ints)

    # Initialize simulator
    simulator = PoolSimulator(pool_state, hook_state)

    # Display initial state
    print("Initial Pool State:")
    print(f"  Tokens: {len(pool_state.tokens)}")
    for i, (token, balance) in enumerate(
        zip(pool_state.tokens, pool_state.balances_live_scaled18)
    ):
        print(f"    Token {i} ({token[:8]}...): {format_balance(balance)}")

    initial_invariant = calculate_invariant(pool_state)
    print(f"  Initial Invariant: {format_invariant(initial_invariant)}")
    print()

    # Set random seed for reproducibility
    random.seed(42)

    print("-" * 80)
    print("Starting Fuzz Swaps (10 iterations)")
    print("-" * 80)
    print()

    # Perform 10 fuzz swaps
    for iteration in range(10):
        current_state = simulator.current_state

        # Randomly select token pair
        token_in_idx = random.randint(0, len(current_state.tokens) - 1)
        token_out_idx = random.randint(0, len(current_state.tokens) - 1)

        # Ensure different tokens
        while token_out_idx == token_in_idx:
            token_out_idx = random.randint(0, len(current_state.tokens) - 1)

        token_in = current_state.tokens[token_in_idx]
        token_out = current_state.tokens[token_out_idx]

        # Calculate swap amount (1-30% of current balance for safety)
        # Note: balance_in is scaled18 with rates applied
        balance_in_scaled18 = current_state.balances_live_scaled18[token_in_idx]

        # Calculate 1-30% of the scaled balance
        max_amount_scaled18 = int(balance_in_scaled18 * 0.30)
        min_amount_scaled18 = int(balance_in_scaled18 * 0.01)  # At least 1%

        # Random amount between 1% and 30% (in scaled18)
        amount_scaled18 = random.randint(min_amount_scaled18, max_amount_scaled18)

        # Convert back to raw amount (undo scaling and rate)
        scaling_factor = current_state.scaling_factors[token_in_idx]
        token_rate = current_state.token_rates[token_in_idx]
        amount_raw = _to_raw_undo_rate_round_down(
            amount_scaled18, scaling_factor, token_rate
        )

        # Create swap input
        swap_input = SwapInput(
            amount_raw=amount_raw,
            swap_kind=SwapKind.GIVENIN,
            token_in=token_in,
            token_out=token_out,
        )

        # Calculate invariant before swap
        invariant_before = calculate_invariant(current_state)

        # Execute swap
        try:
            result = simulator.swap(swap_input, mode=ExecutionMode.COMMIT)

            # Calculate invariant after swap
            invariant_after = calculate_invariant(simulator.current_state)

            # Calculate invariant change
            invariant_change = invariant_after - invariant_before
            invariant_change_pct = (invariant_change / invariant_before) * 100

            # Get final balances for display
            balance_in_after = simulator.current_state.balances_live_scaled18[
                token_in_idx
            ]
            balance_out_after = simulator.current_state.balances_live_scaled18[
                token_out_idx
            ]

            # Display results
            print(f"Swap #{iteration + 1}:")
            print(f"  Direction: Token {token_in_idx} → Token {token_out_idx}")
            print(
                f"  Amount In:  {format_balance(amount_scaled18)} (Token {token_in_idx})"
            )
            print(
                f"  Amount Out: {format_balance(result.amount_calculated_raw)} (Token {token_out_idx})"
            )
            print(
                f"  Balance In:  {format_balance(balance_in_scaled18)} → {format_balance(balance_in_after)}"
            )
            print(
                f"  Balance Out: {format_balance(current_state.balances_live_scaled18[token_out_idx])} → {format_balance(balance_out_after)}"
            )
            print(f"  Invariant Before: {format_invariant(invariant_before)}")
            print(f"  Invariant After:  {format_invariant(invariant_after)}")
            print(
                f"  Invariant Change: {format_invariant(abs(invariant_change))} "
                f"({'↓' if invariant_change < 0 else '↑'} {abs(invariant_change_pct):.6f}%)"
            )
            print()

        except Exception as e:
            print(f"Swap #{iteration + 1}: FAILED - {e}")
            print()

    # Final summary
    print("-" * 80)
    print("Simulation Complete")
    print("-" * 80)
    final_invariant = calculate_invariant(simulator.current_state)
    total_change = final_invariant - initial_invariant
    total_change_pct = (total_change / initial_invariant) * 100

    print(f"Initial Invariant:  {format_invariant(initial_invariant)}")
    print(f"Final Invariant:    {format_invariant(final_invariant)}")
    print(
        f"Total Change:       {format_invariant(abs(total_change))} "
        f"({'↓' if total_change < 0 else '↑'} {abs(total_change_pct):.6f}%)"
    )
    print()
    print(f"Total swaps executed: {len(simulator.get_history())}")
    print()


if __name__ == "__main__":
    main()

from src.common.utils import (
    _compute_and_charge_aggregate_swap_fees,
    _to_raw_undo_rate_round_down,
    find_case_insensitive_index_in_list,
)


def validate_balances(
    initial_pool_state,
    updated_pool_state,
    amount_deltas_raw: list[int],
):
    """
    Validates that updated balances match expected values based on amount deltas.

    Compares for each token:
    - initial_balance[i] + amount_delta[i] ≈ updated_balance[i]

    Use positive deltas for amounts added to the pool (add liquidity, swap token in).
    Use negative deltas for amounts removed from the pool (remove liquidity, swap token out).

    Amounts are scaled from raw to scaled18 using scaling_factors and token_rates.
    Allows tolerance of a few wei for rounding differences.
    """
    # Skip validation for buffer pools (they don't have balances_live_scaled18)
    if not hasattr(initial_pool_state, "balances_live_scaled18"):
        return

    tolerance = 100

    for i, token in enumerate(initial_pool_state.tokens):
        initial_balance_raw = _to_raw_undo_rate_round_down(
            initial_pool_state.balances_live_scaled18[i],
            initial_pool_state.scaling_factors[i],
            initial_pool_state.token_rates[i],
        )

        expected_balance = initial_balance_raw + amount_deltas_raw[i]

        actual_balance = _to_raw_undo_rate_round_down(
            updated_pool_state.balances_live_scaled18[i],
            updated_pool_state.scaling_factors[i],
            updated_pool_state.token_rates[i],
        )

        diff = abs(actual_balance - expected_balance)

        if diff > tolerance:
            raise AssertionError(
                f"Token {token} balance mismatch:\n"
                f"  Expected: {expected_balance}\n"
                f"  Actual:   {actual_balance}\n"
                f"  Diff:     {diff} (tolerance: {tolerance})\n"
                f"  Initial:  {initial_pool_state.balances_live_scaled18[i]}\n"
                f"  Delta (raw): {amount_deltas_raw[i]}\n"
            )


def build_add_liquidity_deltas(
    pool_state,
    amounts_in_raw: list[int],
    swap_fee_amounts_scaled18: list[int],
) -> list[int] | None:
    """
    Builds amount deltas array for an add liquidity operation.

    Returns an array of deltas where each position has:
    +amount_in_raw - aggregate_swap_fee_raw

    Returns None for buffer pools (they don't have balances_live_scaled18).
    """
    # Skip for buffer pools
    if not hasattr(pool_state, "balances_live_scaled18"):
        return None

    deltas = []
    for i in range(len(pool_state.tokens)):
        aggregate_swap_fee_amount_raw = _compute_and_charge_aggregate_swap_fees(
            swap_fee_amounts_scaled18[i],
            pool_state.aggregate_swap_fee,
            pool_state.scaling_factors,
            pool_state.token_rates,
            i,
        )
        deltas.append(amounts_in_raw[i] - aggregate_swap_fee_amount_raw)

    return deltas


def build_remove_liquidity_deltas(
    pool_state,
    amounts_out_raw: list[int],
    swap_fee_amounts_scaled18: list[int],
) -> list[int] | None:
    """
    Builds amount deltas array for a remove liquidity operation.

    Returns an array of deltas where each position has:
    -(amount_out_raw + aggregate_swap_fee_raw)

    Returns None for buffer pools (they don't have balances_live_scaled18).
    """
    # Skip for buffer pools
    if not hasattr(pool_state, "balances_live_scaled18"):
        return None

    deltas = []
    for i in range(len(pool_state.tokens)):
        aggregate_swap_fee_amount_raw = _compute_and_charge_aggregate_swap_fees(
            swap_fee_amounts_scaled18[i],
            pool_state.aggregate_swap_fee,
            pool_state.scaling_factors,
            pool_state.token_rates,
            i,
        )
        deltas.append(-(amounts_out_raw[i] + aggregate_swap_fee_amount_raw))

    return deltas


def build_swap_deltas(
    pool_state,
    token_in: str,
    token_out: str,
    amount_in_raw: int,
    amount_out_raw: int,
    swap_fee_amount_scaled18: int,
) -> list[int] | None:
    """
    Builds amount deltas array for a swap operation.

    Returns an array of deltas where:
    - token_in position has +amount_in_raw (minus aggregate fee)
    - token_out position has -amount_out_raw
    - all other positions have 0

    Returns None for buffer pools (they don't have balances_live_scaled18).
    """

    # Skip for buffer pools
    if not hasattr(pool_state, "balances_live_scaled18"):
        return None

    token_in_index = find_case_insensitive_index_in_list(pool_state.tokens, token_in)
    token_out_index = find_case_insensitive_index_in_list(pool_state.tokens, token_out)

    if token_in_index == -1 or token_out_index == -1:
        raise ValueError(f"Token not found in pool: {token_in} or {token_out}")

    # Calculate aggregate fee from the swap fee amount
    aggregate_swap_fee_amount_raw = _compute_and_charge_aggregate_swap_fees(
        swap_fee_amount_scaled18,
        pool_state.aggregate_swap_fee,
        pool_state.scaling_factors,
        pool_state.token_rates,
        token_in_index,
    )

    # Build deltas array
    deltas = [0] * len(pool_state.tokens)
    deltas[token_in_index] = amount_in_raw - aggregate_swap_fee_amount_raw
    deltas[token_out_index] = -amount_out_raw

    return deltas

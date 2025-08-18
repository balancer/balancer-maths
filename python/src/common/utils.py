from src.common.maths import div_down_fixed, div_up_fixed, mul_down_fixed, mul_up_fixed
from src.common.types import PoolState

MAX_UINT256 = 2**256 - 1


def find_case_insensitive_index_in_list(strings, target):
    # Convert the target to lowercase
    lowercase_target = target.lower()

    # Iterate over the list with index
    for index, string in enumerate(strings):
        # Compare the lowercase version of the string with the lowercase target
        if string.lower() == lowercase_target:
            return index

    # If no match is found, return -1
    return -1


def _to_scaled_18_apply_rate_round_down(
    amount: int, scaling_factor: int, rate: int
) -> int:
    return mul_down_fixed(amount * scaling_factor, rate)


def _to_scaled_18_apply_rate_round_up(
    amount: int, scaling_factor: int, rate: int
) -> int:
    return mul_up_fixed(
        amount * scaling_factor,
        rate,
    )


# @dev Reverses the `scalingFactor` and `tokenRate` applied to `amount`,
# resulting in a smaller or equal value
# depending on whether it needed scaling/rate adjustment or not.
# The result is rounded down.
def _to_raw_undo_rate_round_down(
    amount: int,
    scaling_factor: int,
    token_rate: int,
) -> int:
    # // Do division last. Scaling factor is not a FP18, but a FP18 normalized by FP(1).
    # // `scalingFactor * tokenRate` is a precise FP18, so there is no rounding direction here.
    return div_down_fixed(
        amount,
        scaling_factor * token_rate,
    )


def _to_raw_undo_rate_round_up(
    amount: int,
    scaling_factor: int,
    token_rate: int,
) -> int:
    # // Do division last. Scaling factor is not a FP18, but a FP18 normalized by FP(1).
    # // `scalingFactor * tokenRate` is a precise FP18, so there is no rounding direction here.
    return div_up_fixed(
        amount,
        scaling_factor * token_rate,
    )


def is_same_address(address_one: str, address_two: str) -> bool:
    return address_one.lower() == address_two.lower()


def _copy_to_scaled18_apply_rate_round_down_array(
    amounts, scaling_factors, token_rates
):
    return [
        _to_scaled_18_apply_rate_round_down(a, scaling_factors[i], token_rates[i])
        for i, a in enumerate(amounts)
    ]


def _copy_to_scaled18_apply_rate_round_up_array(amounts, scaling_factors, token_rates):
    return [
        _to_scaled_18_apply_rate_round_up(a, scaling_factors[i], token_rates[i])
        for i, a in enumerate(amounts)
    ]


def _compute_and_charge_aggregate_swap_fees(
    swap_fee_amount_scaled18: int,
    aggregate_swap_fee_percentage: int,
    decimal_scaling_factors,
    token_rates,
    index: int,
) -> int:
    if swap_fee_amount_scaled18 > 0 and aggregate_swap_fee_percentage > 0:
        # // The total swap fee does not go into the pool; amountIn does, and the raw fee at this point does not
        # // modify it. Given that all of the fee may belong to the pool creator (i.e. outside pool balances),
        # // we round down to protect the invariant.
        total_swap_fee_amount_raw = _to_raw_undo_rate_round_down(
            swap_fee_amount_scaled18, decimal_scaling_factors[index], token_rates[index]
        )

        return mul_down_fixed(total_swap_fee_amount_raw, aggregate_swap_fee_percentage)

    return 0


def _get_single_input_index(max_amounts_in):
    length = len(max_amounts_in)
    input_index = length

    for i in range(length):
        if max_amounts_in[i] != 0:
            if input_index != length:
                raise ValueError("Multiple non-zero inputs for single token add")
            input_index = i

    if input_index >= length:
        raise ValueError("All zero inputs for single token add")

    return input_index


def _require_unbalanced_liquidity_enabled(pool_state: PoolState):
    if not pool_state.supports_unbalanced_liquidity:
        raise ValueError("DoesNotSupportUnbalancedLiquidity")

from src.maths import div_down_fixed, mul_up_fixed, mul_down_fixed, div_up_fixed


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
    return mul_down_fixed(mul_down_fixed(amount, scaling_factor), rate)


def _to_scaled_18_apply_rate_round_up(
    amount: int, scaling_factor: int, rate: int
) -> int:
    return mul_up_fixed(
        mul_up_fixed(amount, scaling_factor),
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
    # Do division last, and round scalingFactor * tokenRate up to divide by a larger number.
    return div_down_fixed(
        amount,
        mul_up_fixed(scaling_factor, token_rate),
    )


def _to_raw_undo_rate_round_up(
    amount: int,
    scaling_factor: int,
    token_rate: int,
) -> int:
    # Do division last, and round scalingFactor * tokenRate down to divide by a smaller number.
    return div_up_fixed(
        amount,
        mul_down_fixed(scaling_factor, token_rate),
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
) -> int:
    if swap_fee_amount_scaled18 > 0 and aggregate_swap_fee_percentage > 0:
        return mul_up_fixed(
            swap_fee_amount_scaled18,
            aggregate_swap_fee_percentage,
        )

    return 0

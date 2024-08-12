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

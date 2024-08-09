from enum import Enum


class SwapKind(Enum):
    GIVENIN = 1
    GIVENOUT = 2


def swap(swap_input, pool_state, pool_class, hook_class):

    input_index = find_case_insensitive_index_in_list(
        pool_state["tokens"], swap_input["token_in"]
    )
    if input_index == -1:
        raise SystemError("Input token not found on pool")

    output_index = find_case_insensitive_index_in_list(
        pool_state["tokens"], swap_input["token_out"]
    )
    if input_index == -1:
        raise SystemError("Output token not found on pool")

    amount_given_scaled18 = _update_amount_given_in_vars(
        swap_input["amount_raw"],
        swap_input["swap_kind"],
        input_index,
        output_index,
        pool_state["scalingFactors"],
        pool_state["tokenRates"],
    )

    return pool_class.on_swap(1)


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


def _update_amount_given_in_vars(
    amount_given_raw: int,
    swap_kind: SwapKind,
    index_in: int,
    index_out: int,
    scaling_factors: list[int],
    token_rates: list[int],
) -> int:
    # If the amountGiven is entering the pool math (ExactIn), round down
    # since a lower apparent amountIn leads
    # to a lower calculated amountOut, favoring the pool.
    if swap_kind == SwapKind.GIVENIN:
        amount_given_scaled_18 = _to_scaled_18_apply_rate_round_down(
            amount_given_raw,
            scaling_factors[index_in],
            token_rates[index_in],
        )
    else:
        amount_given_scaled_18 = _to_scaled_18_apply_rate_round_up(
            amount_given_raw,
            scaling_factors[index_out],
            token_rates[index_out],
        )

    return amount_given_scaled_18


def _to_scaled_18_apply_rate_round_down(
    amount: int, scaling_factor: int, rate: int
) -> int:
    # Implement the logic for rounding down with scaling and rate
    # Placeholder for the actual method implementation
    return amount * scaling_factor * rate // (10**18)


def _to_scaled_18_apply_rate_round_up(
    amount: int, scaling_factor: int, rate: int
) -> int:
    # Implement the logic for rounding up with scaling and rate
    # Placeholder for the actual method implementation
    return (amount * scaling_factor * rate + (10**18 - 1)) // (10**18)

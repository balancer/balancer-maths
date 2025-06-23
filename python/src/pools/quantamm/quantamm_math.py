from typing import List, Tuple

from src.common.maths import mul_down_fixed


def calculate_block_normalised_weight(
    weight: int,
    multiplier: int,
    time_since_last_update: int,
) -> int:
    """
    Calculate the current block weight based on time interpolation
    Args:
        weight: The base weight
        multiplier: The weight multiplier
        time_since_last_update: The time since the last weight update
    Returns:
        The interpolated weight
    """
    # multiplier is always below 1, we multiply by 1e18 for rounding
    multiplier_scaled18 = multiplier * 1000000000000000000

    if multiplier > 0:
        return weight + mul_down_fixed(multiplier_scaled18, time_since_last_update)
    else:
        return weight - mul_down_fixed(-multiplier_scaled18, time_since_last_update)


def get_first_four_weights_and_multipliers(
    tokens: List[str],
    first_four_weights_and_multipliers: List[int],
) -> Tuple[List[int], List[int]]:
    """
    Extract weights and multipliers from the first four tokens
    Args:
        tokens: List of token addresses
        first_four_weights_and_multipliers: Packed weights and multipliers for first four tokens
    Returns:
        Tuple of (weights, multipliers) for first four tokens
    """
    less_than_4_tokens_offset = min(4, len(tokens))

    weights = [0] * less_than_4_tokens_offset
    multipliers = [0] * less_than_4_tokens_offset

    for i in range(less_than_4_tokens_offset):
        weights[i] = first_four_weights_and_multipliers[i]
        multipliers[i] = first_four_weights_and_multipliers[
            i + less_than_4_tokens_offset
        ]

    return weights, multipliers


def get_second_four_weights_and_multipliers(
    tokens: List[str],
    second_four_weights_and_multipliers: List[int],
) -> Tuple[List[int], List[int]]:
    """
    Extract weights and multipliers from the remaining tokens
    Args:
        tokens: List of token addresses
        second_four_weights_and_multipliers: Packed weights and multipliers for remaining tokens
    Returns:
        Tuple of (weights, multipliers) for remaining tokens
    """
    if len(tokens) <= 4:
        return [], []

    more_than_4_tokens_offset = len(tokens) - 4

    weights = [0] * more_than_4_tokens_offset
    multipliers = [0] * more_than_4_tokens_offset

    for i in range(more_than_4_tokens_offset):
        weights[i] = second_four_weights_and_multipliers[i]
        multipliers[i] = second_four_weights_and_multipliers[
            i + more_than_4_tokens_offset
        ]

    return weights, multipliers

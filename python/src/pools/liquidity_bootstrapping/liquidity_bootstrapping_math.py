from typing import List

from src.common.constants import WAD
from src.common.maths import div_down_fixed, mul_down_fixed


def get_normalized_weights(
    project_token_index: int,
    current_time: int,
    start_time: int,
    end_time: int,
    project_token_start_weight: int,
    project_token_end_weight: int,
) -> List[int]:
    normalized_weights = [0, 0]
    reserve_token_index = 1 if project_token_index == 0 else 0
    normalized_weights[project_token_index] = get_project_token_normalized_weight(
        current_time,
        start_time,
        end_time,
        project_token_start_weight,
        project_token_end_weight,
    )
    normalized_weights[reserve_token_index] = (
        WAD - normalized_weights[project_token_index]
    )
    return normalized_weights


def get_project_token_normalized_weight(
    current_time: int,
    start_time: int,
    end_time: int,
    start_weight: int,
    end_weight: int,
) -> int:
    pct_progress = calculate_value_change_progress(current_time, start_time, end_time)
    return interpolate_value(start_weight, end_weight, pct_progress)


def calculate_value_change_progress(
    current_time: int, start_time: int, end_time: int
) -> int:
    if current_time >= end_time:
        return WAD
    elif current_time <= start_time:
        return 0
    total_seconds = end_time - start_time
    seconds_elapsed = current_time - start_time
    progress = div_down_fixed(seconds_elapsed, total_seconds)
    return progress


def interpolate_value(start_value: int, end_value: int, pct_progress: int) -> int:
    if pct_progress >= WAD or start_value == end_value:
        return end_value
    if pct_progress == 0:
        return start_value
    if start_value > end_value:
        delta = mul_down_fixed(pct_progress, start_value - end_value)
        return start_value - delta
    else:
        delta = mul_down_fixed(pct_progress, end_value - start_value)
        return start_value + delta

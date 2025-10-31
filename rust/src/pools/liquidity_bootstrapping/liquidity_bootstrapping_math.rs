use crate::common::constants::WAD;
use crate::common::maths::{div_down_fixed, mul_down_fixed};
use alloy_primitives::U256;

/// Calculate the normalized weights for a liquidity bootstrapping pool
///
/// # Arguments
/// * `project_token_index` - Index of the project token
/// * `current_time` - Current timestamp in seconds
/// * `start_time` - Start time of the weight change
/// * `end_time` - End time of the weight change
/// * `project_token_start_weight` - Initial weight of the project token
/// * `project_token_end_weight` - Final weight of the project token
///
/// # Returns
/// Array of normalized weights for the tokens
pub fn get_normalized_weights(
    project_token_index: usize,
    current_time: &U256,
    start_time: &U256,
    end_time: &U256,
    project_token_start_weight: &U256,
    project_token_end_weight: &U256,
) -> Vec<U256> {
    let mut normalized_weights = vec![U256::ZERO; 2];

    // Infer the reserve token index
    let reserve_token_index = if project_token_index == 0 { 1 } else { 0 };

    // Calculate the normalized weight for the project token
    normalized_weights[project_token_index] = get_project_token_normalized_weight(
        current_time,
        start_time,
        end_time,
        project_token_start_weight,
        project_token_end_weight,
    );

    // Calculate the normalized weight for the reserve token
    normalized_weights[reserve_token_index] = *WAD - normalized_weights[project_token_index];

    normalized_weights
}

/// Calculate the normalized weight of the project token
fn get_project_token_normalized_weight(
    current_time: &U256,
    start_time: &U256,
    end_time: &U256,
    start_weight: &U256,
    end_weight: &U256,
) -> U256 {
    let pct_progress = calculate_value_change_progress(current_time, start_time, end_time);
    interpolate_value(start_weight, end_weight, &pct_progress)
}

/// Calculate the progress of a value change as a fixed-point number
fn calculate_value_change_progress(
    current_time: &U256,
    start_time: &U256,
    end_time: &U256,
) -> U256 {
    if current_time >= end_time {
        return *WAD; // Fully completed
    } else if current_time <= start_time {
        return U256::ZERO; // Not started
    }

    let total_seconds = end_time - start_time;
    let seconds_elapsed = current_time - start_time;

    div_down_fixed(&seconds_elapsed, &total_seconds).unwrap_or(U256::ZERO)
}

/// Interpolate a value based on the progress of a change
fn interpolate_value(start_value: &U256, end_value: &U256, pct_progress: &U256) -> U256 {
    if pct_progress >= &*WAD || start_value == end_value {
        return *end_value;
    }

    if pct_progress == &U256::ZERO {
        return *start_value;
    }

    if start_value > end_value {
        let delta = mul_down_fixed(pct_progress, &(start_value - end_value)).unwrap_or(U256::ZERO);
        start_value - delta
    } else {
        let delta = mul_down_fixed(pct_progress, &(end_value - start_value)).unwrap_or(U256::ZERO);
        start_value + delta
    }
}

use crate::common::maths::{div_down_fixed, mul_down_fixed};
use num_bigint::BigInt;
use num_traits::Zero;

lazy_static::lazy_static! {
    static ref WAD: BigInt = BigInt::from(1000000000000000000u64); // 1e18
}

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
    current_time: &BigInt,
    start_time: &BigInt,
    end_time: &BigInt,
    project_token_start_weight: &BigInt,
    project_token_end_weight: &BigInt,
) -> Vec<BigInt> {
    let mut normalized_weights = vec![BigInt::zero(); 2];

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
    normalized_weights[reserve_token_index] = &*WAD - &normalized_weights[project_token_index];

    normalized_weights
}

/// Calculate the normalized weight of the project token
fn get_project_token_normalized_weight(
    current_time: &BigInt,
    start_time: &BigInt,
    end_time: &BigInt,
    start_weight: &BigInt,
    end_weight: &BigInt,
) -> BigInt {
    let pct_progress = calculate_value_change_progress(current_time, start_time, end_time);
    interpolate_value(start_weight, end_weight, &pct_progress)
}

/// Calculate the progress of a value change as a fixed-point number
fn calculate_value_change_progress(
    current_time: &BigInt,
    start_time: &BigInt,
    end_time: &BigInt,
) -> BigInt {
    if current_time >= end_time {
        return WAD.clone(); // Fully completed
    } else if current_time <= start_time {
        return BigInt::zero(); // Not started
    }

    let total_seconds = end_time - start_time;
    let seconds_elapsed = current_time - start_time;

    div_down_fixed(&seconds_elapsed, &total_seconds).unwrap_or_else(|_| BigInt::zero())
}

/// Interpolate a value based on the progress of a change
fn interpolate_value(
    start_value: &BigInt,
    end_value: &BigInt,
    pct_progress: &BigInt,
) -> BigInt {
    if pct_progress >= &*WAD || start_value == end_value {
        return end_value.clone();
    }

    if pct_progress == &BigInt::zero() {
        return start_value.clone();
    }

    if start_value > end_value {
        let delta = mul_down_fixed(pct_progress, &(start_value - end_value))
            .unwrap_or_else(|_| BigInt::zero());
        start_value - delta
    } else {
        let delta = mul_down_fixed(pct_progress, &(end_value - start_value))
            .unwrap_or_else(|_| BigInt::zero());
        start_value + delta
    }
} 
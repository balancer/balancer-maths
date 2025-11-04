use crate::common::maths::mul_down_fixed;
use alloy_primitives::{uint, I256, U256};

pub const ONE: U256 = uint!(1000000000000000000_U256); // 1e18
pub const ONE_SIGNED: I256 = I256::from_raw(uint!(1000000000000000000_U256)); // 1e18

/// Calculate the current block weight based on time interpolation
///
/// # Arguments
/// * `weight` - The base weight
/// * `multiplier` - The weight multiplier
/// * `time_since_last_update` - The time since the last weight update
///
/// # Returns
/// The interpolated weight
pub fn calculate_block_normalised_weight(
    weight: &I256,
    multiplier: &I256,
    time_since_last_update: &U256,
) -> U256 {
    // multiplier is always below 1, we multiply by 1e18 for rounding
    let multiplier_scaled18 = *multiplier * ONE_SIGNED;

    if multiplier > &I256::ZERO {
        weight.into_raw()
            + mul_down_fixed(&multiplier_scaled18.into_raw(), time_since_last_update)
                .unwrap_or(U256::ZERO)
    } else {
        weight.into_raw()
            - mul_down_fixed(&(-multiplier_scaled18.into_raw()), time_since_last_update)
                .unwrap_or(U256::ZERO)
    }
}

/// Extract weights and multipliers from the first four tokens
///
/// # Arguments
/// * `tokens` - List of token addresses
/// * `first_four_weights_and_multipliers` - Packed weights and multipliers for first four tokens
///
/// # Returns
/// Tuple of (weights, multipliers) for first four tokens
pub fn get_first_four_weights_and_multipliers(
    tokens: &[String],
    first_four_weights_and_multipliers: &[I256],
) -> (Vec<I256>, Vec<I256>) {
    let less_than_4_tokens_offset = tokens.len().min(4);

    let mut weights = vec![I256::ZERO; less_than_4_tokens_offset];
    let mut multipliers = vec![I256::ZERO; less_than_4_tokens_offset];

    // Convert I256 to U256 for weights
    weights[..less_than_4_tokens_offset]
        .copy_from_slice(&first_four_weights_and_multipliers[..less_than_4_tokens_offset]);

    // Convert I256 to U256 for multipliers
    multipliers[..less_than_4_tokens_offset].copy_from_slice(
        &first_four_weights_and_multipliers
            [less_than_4_tokens_offset..(less_than_4_tokens_offset + less_than_4_tokens_offset)],
    );

    (weights, multipliers)
}

/// Extract weights and multipliers from the remaining tokens
///
/// # Arguments
/// * `tokens` - List of token addresses
/// * `second_four_weights_and_multipliers` - Packed weights and multipliers for remaining tokens
///
/// # Returns
/// Tuple of (weights, multipliers) for remaining tokens
pub fn get_second_four_weights_and_multipliers(
    tokens: &[String],
    second_four_weights_and_multipliers: &[I256],
) -> (Vec<I256>, Vec<I256>) {
    if tokens.len() <= 4 {
        return (Vec::new(), Vec::new());
    }

    let more_than_4_tokens_offset = tokens.len() - 4;

    let mut weights = vec![I256::ZERO; more_than_4_tokens_offset];
    let mut multipliers = vec![I256::ZERO; more_than_4_tokens_offset];

    // Convert I256 to U256 for weights
    weights[..more_than_4_tokens_offset]
        .copy_from_slice(&second_four_weights_and_multipliers[..more_than_4_tokens_offset]);

    // Convert I256 to U256 for multipliers
    multipliers[..more_than_4_tokens_offset].copy_from_slice(
        &second_four_weights_and_multipliers
            [more_than_4_tokens_offset..(more_than_4_tokens_offset + more_than_4_tokens_offset)],
    );

    (weights, multipliers)
}

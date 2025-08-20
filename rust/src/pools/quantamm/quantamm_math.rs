use crate::common::maths::mul_down_fixed;
use num_bigint::BigInt;
use num_traits::Zero;

lazy_static::lazy_static! {
    static ref ONE: BigInt = BigInt::from(1000000000000000000u64); // 1e18
}

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
    weight: &BigInt,
    multiplier: &BigInt,
    time_since_last_update: &BigInt,
) -> BigInt {
    // multiplier is always below 1, we multiply by 1e18 for rounding
    let multiplier_scaled18 = multiplier * &*ONE;

    if multiplier > &BigInt::zero() {
        weight
            + mul_down_fixed(&multiplier_scaled18, time_since_last_update)
                .unwrap_or_else(|_| BigInt::zero())
    } else {
        weight
            - mul_down_fixed(&(-multiplier_scaled18), time_since_last_update)
                .unwrap_or_else(|_| BigInt::zero())
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
    first_four_weights_and_multipliers: &[BigInt],
) -> (Vec<BigInt>, Vec<BigInt>) {
    let less_than_4_tokens_offset = tokens.len().min(4);

    let mut weights = vec![BigInt::zero(); less_than_4_tokens_offset];
    let mut multipliers = vec![BigInt::zero(); less_than_4_tokens_offset];

    weights[..less_than_4_tokens_offset]
        .clone_from_slice(&first_four_weights_and_multipliers[..less_than_4_tokens_offset]);
    multipliers[..less_than_4_tokens_offset].clone_from_slice(
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
    second_four_weights_and_multipliers: &[BigInt],
) -> (Vec<BigInt>, Vec<BigInt>) {
    if tokens.len() <= 4 {
        return (Vec::new(), Vec::new());
    }

    let more_than_4_tokens_offset = tokens.len() - 4;

    let mut weights = vec![BigInt::zero(); more_than_4_tokens_offset];
    let mut multipliers = vec![BigInt::zero(); more_than_4_tokens_offset];

    weights[..more_than_4_tokens_offset]
        .clone_from_slice(&second_four_weights_and_multipliers[..more_than_4_tokens_offset]);
    multipliers[..more_than_4_tokens_offset].clone_from_slice(
        &second_four_weights_and_multipliers
            [more_than_4_tokens_offset..(more_than_4_tokens_offset + more_than_4_tokens_offset)],
    );

    (weights, multipliers)
}

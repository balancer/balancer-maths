//! Common utility functions for Balancer pools

use crate::common::errors::PoolError;
use crate::common::maths::{div_down_fixed, div_up_fixed, mul_down_fixed, mul_up_fixed};
use crate::common::types::PoolState;
use alloy_primitives::U256;

/// Find case insensitive index in list
pub fn find_case_insensitive_index_in_list(strings: &[String], target: &str) -> Option<usize> {
    let lowercase_target = target.to_lowercase();

    for (index, string) in strings.iter().enumerate() {
        if string.to_lowercase() == lowercase_target {
            return Some(index);
        }
    }

    None
}

/// Convert to scaled 18 with rate applied, rounding down
pub fn to_scaled_18_apply_rate_round_down(
    amount: &U256,
    scaling_factor: &U256,
    rate: &U256,
) -> Result<U256, PoolError> {
    mul_down_fixed(&(amount * scaling_factor), rate)
}

/// Convert to scaled 18 with rate applied, rounding up
pub fn to_scaled_18_apply_rate_round_up(
    amount: &U256,
    scaling_factor: &U256,
    rate: &U256,
) -> Result<U256, PoolError> {
    mul_up_fixed(&(amount * scaling_factor), rate)
}

/// Convert scaled 18 amount back to raw amount, rounding down
/// Reverses the `scalingFactor` and `tokenRate` applied to `amount`,
/// resulting in a smaller or equal value depending on whether it needed scaling/rate adjustment or not.
/// The result is rounded down.
pub fn to_raw_undo_rate_round_down(
    amount: &U256,
    scaling_factor: &U256,
    token_rate: &U256,
) -> Result<U256, PoolError> {
    // Do division last. Scaling factor is not a FP18, but a FP18 normalized by FP(1).
    // `scalingFactor * tokenRate` is a precise FP18, so there is no rounding direction here.
    let denominator = scaling_factor * token_rate;
    let result = div_down_fixed(amount, &denominator)?;
    Ok(result)
}

/// Convert scaled 18 amount back to raw amount, rounding up
/// Reverses the `scalingFactor` and `tokenRate` applied to `amount`,
/// resulting in a smaller or equal value depending on whether it needed scaling/rate adjustment or not.
/// The result is rounded up.
pub fn to_raw_undo_rate_round_up(
    amount: &U256,
    scaling_factor: &U256,
    token_rate: &U256,
) -> Result<U256, PoolError> {
    // Do division last. Scaling factor is not a FP18, but a FP18 normalized by FP(1).
    // `scalingFactor * tokenRate` is a precise FP18, so there is no rounding direction here.
    div_up_fixed(amount, &(scaling_factor * token_rate))
}

/// Check if two addresses are the same (case insensitive)
pub fn is_same_address(address_one: &str, address_two: &str) -> bool {
    address_one.to_lowercase() == address_two.to_lowercase()
}

/// Copy amounts to scaled 18 with rate applied, rounding down
pub fn copy_to_scaled18_apply_rate_round_down_array(
    amounts: &[U256],
    scaling_factors: &[U256],
    token_rates: &[U256],
) -> Result<Vec<U256>, PoolError> {
    let mut scaled_amounts = Vec::with_capacity(amounts.len());

    for (i, amount) in amounts.iter().enumerate() {
        let scaled_amount =
            to_scaled_18_apply_rate_round_down(amount, &scaling_factors[i], &token_rates[i])?;
        scaled_amounts.push(scaled_amount);
    }

    Ok(scaled_amounts)
}

/// Copy amounts to scaled 18 with rate applied, rounding up
pub fn copy_to_scaled18_apply_rate_round_up_array(
    amounts: &[U256],
    scaling_factors: &[U256],
    token_rates: &[U256],
) -> Result<Vec<U256>, PoolError> {
    let mut scaled_amounts = Vec::with_capacity(amounts.len());

    for (i, amount) in amounts.iter().enumerate() {
        let scaled_amount =
            to_scaled_18_apply_rate_round_up(amount, &scaling_factors[i], &token_rates[i])?;
        scaled_amounts.push(scaled_amount);
    }

    Ok(scaled_amounts)
}

/// Compute and charge aggregate swap fees
pub fn compute_and_charge_aggregate_swap_fees(
    swap_fee_amount_scaled18: &U256,
    aggregate_swap_fee_percentage: &U256,
    decimal_scaling_factors: &[U256],
    token_rates: &[U256],
    index: usize,
) -> Result<U256, PoolError> {
    if swap_fee_amount_scaled18 > &U256::ZERO && aggregate_swap_fee_percentage > &U256::ZERO {
        // The total swap fee does not go into the pool; amountIn does, and the raw fee at this point does not
        // modify it. Given that all of the fee may belong to the pool creator (i.e. outside pool balances),
        // we round down to protect the invariant.
        let total_swap_fee_amount_raw = to_raw_undo_rate_round_down(
            swap_fee_amount_scaled18,
            &decimal_scaling_factors[index],
            &token_rates[index],
        )?;

        Ok(mul_down_fixed(
            &total_swap_fee_amount_raw,
            aggregate_swap_fee_percentage,
        )?)
    } else {
        Ok(U256::ZERO)
    }
}

/// Get single input index from amounts
pub fn get_single_input_index(max_amounts_in: &[U256]) -> Result<usize, PoolError> {
    let length = max_amounts_in.len();
    let mut input_index = length;

    for (i, amount) in max_amounts_in.iter().enumerate() {
        if amount != &U256::ZERO {
            if input_index != length {
                return Err(PoolError::Custom(
                    "Multiple non-zero inputs for single token add".to_string(),
                ));
            }
            input_index = i;
        }
    }

    if input_index >= length {
        return Err(PoolError::Custom(
            "All zero inputs for single token add".to_string(),
        ));
    }

    Ok(input_index)
}

/// Require unbalanced liquidity to be enabled
pub fn require_unbalanced_liquidity_enabled(pool_state: &PoolState) -> Result<(), PoolError> {
    if !pool_state.base().supports_unbalanced_liquidity {
        return Err(PoolError::Custom(
            "DoesNotSupportUnbalancedLiquidity".to_string(),
        ));
    }
    Ok(())
}

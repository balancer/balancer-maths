//! Common utility functions for Balancer pools

use crate::common::errors::PoolError;
use crate::common::maths::{div_down_fixed, div_up_fixed, mul_down_fixed, mul_up_fixed};
use crate::common::types::PoolState;
use num_bigint::BigInt;
use num_traits::Zero;

/// Maximum uint256 value
pub const MAX_UINT256: &str =
    "115792089237316195423570985008687907853269984665640564039457584007913129639935";

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
    amount: &BigInt,
    scaling_factor: &BigInt,
    rate: &BigInt,
) -> Result<BigInt, PoolError> {
    Ok(mul_down_fixed(&(amount * scaling_factor), rate)?)
}

/// Convert to scaled 18 with rate applied, rounding up
pub fn to_scaled_18_apply_rate_round_up(
    amount: &BigInt,
    scaling_factor: &BigInt,
    rate: &BigInt,
) -> Result<BigInt, PoolError> {
    Ok(mul_up_fixed(&(amount * scaling_factor), rate)?)
}

/// Convert scaled 18 amount back to raw amount, rounding down
/// Reverses the `scalingFactor` and `tokenRate` applied to `amount`,
/// resulting in a smaller or equal value depending on whether it needed scaling/rate adjustment or not.
/// The result is rounded down.
pub fn to_raw_undo_rate_round_down(
    amount: &BigInt,
    scaling_factor: &BigInt,
    token_rate: &BigInt,
) -> Result<BigInt, PoolError> {
    // Do division last. Scaling factor is not a FP18, but a FP18 normalized by FP(1).
    // `scalingFactor * tokenRate` is a precise FP18, so there is no rounding direction here.
    Ok(div_down_fixed(amount, &(scaling_factor * token_rate))?)
}

/// Convert scaled 18 amount back to raw amount, rounding up
/// Reverses the `scalingFactor` and `tokenRate` applied to `amount`,
/// resulting in a smaller or equal value depending on whether it needed scaling/rate adjustment or not.
/// The result is rounded up.
pub fn to_raw_undo_rate_round_up(
    amount: &BigInt,
    scaling_factor: &BigInt,
    token_rate: &BigInt,
) -> Result<BigInt, PoolError> {
    // Do division last. Scaling factor is not a FP18, but a FP18 normalized by FP(1).
    // `scalingFactor * tokenRate` is a precise FP18, so there is no rounding direction here.
    Ok(div_up_fixed(amount, &(scaling_factor * token_rate))?)
}

/// Check if two addresses are the same (case insensitive)
pub fn is_same_address(address_one: &str, address_two: &str) -> bool {
    address_one.to_lowercase() == address_two.to_lowercase()
}

/// Copy amounts to scaled 18 with rate applied, rounding down
pub fn copy_to_scaled18_apply_rate_round_down_array(
    amounts: &[BigInt],
    scaling_factors: &[BigInt],
    token_rates: &[BigInt],
) -> Result<Vec<BigInt>, PoolError> {
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
    amounts: &[BigInt],
    scaling_factors: &[BigInt],
    token_rates: &[BigInt],
) -> Result<Vec<BigInt>, PoolError> {
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
    swap_fee_amount_scaled18: &BigInt,
    aggregate_swap_fee_percentage: &BigInt,
    decimal_scaling_factors: &[BigInt],
    token_rates: &[BigInt],
    index: usize,
) -> Result<BigInt, PoolError> {
    if swap_fee_amount_scaled18 > &BigInt::zero() && aggregate_swap_fee_percentage > &BigInt::zero()
    {
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
        Ok(BigInt::zero())
    }
}

/// Get single input index from amounts
pub fn get_single_input_index(max_amounts_in: &[BigInt]) -> Result<usize, PoolError> {
    let length = max_amounts_in.len();
    let mut input_index = length;

    for (i, amount) in max_amounts_in.iter().enumerate() {
        if amount != &BigInt::zero() {
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

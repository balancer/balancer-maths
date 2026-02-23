//! ERC4626 Buffer wrap or unwrap function

use crate::common::types::{SwapInput, SwapKind};
use crate::pools::buffer::buffer_data::BufferState;
use crate::pools::buffer::buffer_math::calculate_buffer_amounts;
use crate::pools::buffer::enums::WrappingDirection;
use alloy_primitives::{uint, U256};

pub const _MINIMUM_WRAP_AMOUNT: U256 = uint!(1000_U256);

/// ERC4626 Buffer wrap or unwrap function
///
/// # Arguments
/// * `swap_input` - Swap input parameters
/// * `pool_state` - Buffer pool state
///
/// # Returns
/// Calculated amount for wrap/unwrap operation
pub fn erc4626_buffer_wrap_or_unwrap(
    swap_input: &SwapInput,
    pool_state: &BufferState,
) -> Result<U256, String> {
    if swap_input.amount_raw < _MINIMUM_WRAP_AMOUNT {
        // If amount given is too small, rounding issues can be introduced that favors the user and can drain
        // the buffer. _MINIMUM_WRAP_AMOUNT prevents it. Most tokens have protections against it already, this
        // is just an extra layer of security.
        return Err("wrapAmountTooSmall".to_string());
    }

    // Determine wrapping direction based on token addresses
    let wrapping_direction =
        if is_same_address(&swap_input.token_in, &pool_state.immutable.pool_address) {
            WrappingDirection::Unwrap
        } else {
            WrappingDirection::Wrap
        };

    let scaling_factor = &pool_state.immutable.scaling_factor;

    // Scale underlying amounts up before 18-decimal math
    let amount_for_calc = if (wrapping_direction == WrappingDirection::Wrap
        && swap_input.swap_kind == SwapKind::GivenIn)
        || (wrapping_direction == WrappingDirection::Unwrap
            && swap_input.swap_kind == SwapKind::GivenOut)
    {
        swap_input.amount_raw * *scaling_factor
    } else {
        swap_input.amount_raw
    };

    let result = calculate_buffer_amounts(
        wrapping_direction.clone(),
        swap_input.swap_kind.clone(),
        &amount_for_calc,
        &pool_state.mutable.rate,
        pool_state.mutable.max_deposit.as_ref(),
        pool_state.mutable.max_mint.as_ref(),
    )?;

    // Scale results back down to underlying decimals
    if (wrapping_direction == WrappingDirection::Wrap && swap_input.swap_kind == SwapKind::GivenOut)
        || (wrapping_direction == WrappingDirection::Unwrap
            && swap_input.swap_kind == SwapKind::GivenIn)
    {
        Ok(result / *scaling_factor)
    } else {
        Ok(result)
    }
}

/// Check if two addresses are the same (case-insensitive)
fn is_same_address(addr1: &str, addr2: &str) -> bool {
    addr1.to_lowercase() == addr2.to_lowercase()
}

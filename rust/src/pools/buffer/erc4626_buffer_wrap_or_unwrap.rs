//! ERC4626 Buffer wrap or unwrap function

use crate::common::types::SwapInput;
use crate::pools::buffer::buffer_data::BufferState;
use crate::pools::buffer::buffer_math::calculate_buffer_amounts;
use crate::pools::buffer::enums::WrappingDirection;
use num_bigint::BigInt;

lazy_static::lazy_static! {
    static ref _MINIMUM_WRAP_AMOUNT: BigInt = BigInt::from(1000u64);
}

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
) -> Result<BigInt, String> {
    if swap_input.amount_raw < *_MINIMUM_WRAP_AMOUNT {
        // If amount given is too small, rounding issues can be introduced that favors the user and can drain
        // the buffer. _MINIMUM_WRAP_AMOUNT prevents it. Most tokens have protections against it already, this
        // is just an extra layer of security.
        return Err("wrapAmountTooSmall".to_string());
    }

    // Determine wrapping direction based on token addresses
    let wrapping_direction = if is_same_address(&swap_input.token_in, &pool_state.immutable.pool_address) {
        WrappingDirection::Unwrap
    } else {
        WrappingDirection::Wrap
    };

    calculate_buffer_amounts(
        wrapping_direction,
        swap_input.swap_kind.clone(),
        &swap_input.amount_raw,
        &pool_state.mutable.rate,
        pool_state.mutable.max_deposit.as_ref(),
        pool_state.mutable.max_mint.as_ref(),
    )
}

/// Check if two addresses are the same (case-insensitive)
fn is_same_address(addr1: &str, addr2: &str) -> bool {
    addr1.to_lowercase() == addr2.to_lowercase()
} 
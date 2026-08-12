use crate::common::errors::PoolError;
use crate::common::maths::{div_down_fixed, div_up_fixed, mul_down_fixed, mul_up_fixed};
use crate::common::types::{Rounding, SwapKind};
use crate::pools::buffer::enums::WrappingDirection;
use alloy_primitives::U256;

/// Calculate buffer amounts for wrap/unwrap operations
///
/// # Arguments
/// * `direction` - Wrapping direction (Wrap or Unwrap)
/// * `kind` - Swap kind (GivenIn or GivenOut)
/// * `amount_raw` - Raw amount to convert
/// * `rate` - Exchange rate (scaled 18)
/// * `max_deposit` - Maximum deposit limit (optional)
/// * `max_mint` - Maximum mint limit (optional)
///
/// # Returns
/// Converted amount
pub fn calculate_buffer_amounts(
    direction: WrappingDirection,
    kind: SwapKind,
    amount_raw: &U256,
    rate: &U256,
    max_deposit: Option<&U256>,
    max_mint: Option<&U256>,
) -> Result<U256, PoolError> {
    match direction {
        WrappingDirection::Wrap => {
            // Amount in is underlying tokens, amount out is wrapped tokens
            match kind {
                SwapKind::GivenIn => {
                    // previewDeposit
                    let max_assets = max_deposit.unwrap_or(&U256::MAX);
                    if amount_raw > max_assets {
                        return Err(PoolError::Erc4626ExceededMaxDeposit {
                            requested: *amount_raw,
                            max: *max_assets,
                        });
                    }
                    _convert_to_shares(amount_raw, rate, Rounding::RoundDown)
                }
                SwapKind::GivenOut => {
                    // previewMint
                    let max_shares = max_mint.unwrap_or(&U256::MAX);
                    if amount_raw > max_shares {
                        return Err(PoolError::Erc4626ExceededMaxMint {
                            requested: *amount_raw,
                            max: *max_mint.unwrap_or(&U256::ZERO),
                        });
                    }
                    _convert_to_assets(amount_raw, rate, Rounding::RoundUp)
                }
            }
        }
        WrappingDirection::Unwrap => {
            // Amount in is wrapped tokens, amount out is underlying tokens
            match kind {
                SwapKind::GivenIn => {
                    // previewRedeem
                    _convert_to_assets(amount_raw, rate, Rounding::RoundDown)
                }
                SwapKind::GivenOut => {
                    // previewWithdraw
                    _convert_to_shares(amount_raw, rate, Rounding::RoundUp)
                }
            }
        }
    }
}

/// Convert assets to shares
fn _convert_to_shares(assets: &U256, rate: &U256, rounding: Rounding) -> Result<U256, PoolError> {
    match rounding {
        Rounding::RoundUp => div_up_fixed(assets, rate),
        Rounding::RoundDown => div_down_fixed(assets, rate),
    }
}

/// Convert shares to assets
fn _convert_to_assets(shares: &U256, rate: &U256, rounding: Rounding) -> Result<U256, PoolError> {
    match rounding {
        Rounding::RoundUp => mul_up_fixed(shares, rate),
        Rounding::RoundDown => mul_down_fixed(shares, rate),
    }
}

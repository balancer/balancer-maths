use crate::common::maths::{div_down_fixed, div_up_fixed, mul_down_fixed, mul_up_fixed};
use crate::common::types::{Rounding, SwapKind};
use crate::pools::buffer::enums::WrappingDirection;
use num_bigint::BigInt;
use num_traits::Zero;

lazy_static::lazy_static! {
    static ref MAX_UINT256: BigInt = BigInt::from(2u64).pow(256) - BigInt::from(1u64);
}

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
    amount_raw: &BigInt,
    rate: &BigInt,
    max_deposit: Option<&BigInt>,
    max_mint: Option<&BigInt>,
) -> Result<BigInt, String> {
    match direction {
        WrappingDirection::Wrap => {
            // Amount in is underlying tokens, amount out is wrapped tokens
            match kind {
                SwapKind::GivenIn => {
                    // previewDeposit
                    let max_assets = max_deposit.unwrap_or(&*MAX_UINT256);
                    if amount_raw > max_assets {
                        return Err(format!(
                            "ERC4626ExceededMaxDeposit {} {}",
                            amount_raw, max_assets
                        ));
                    }
                    Ok(_convert_to_shares(amount_raw, rate, Rounding::RoundDown))
                }
                SwapKind::GivenOut => {
                    // previewMint
                    let max_shares = max_mint.unwrap_or(&*MAX_UINT256);
                    if amount_raw > max_shares {
                        return Err(format!(
                            "ERC4626ExceededMaxMint {} {}",
                            amount_raw,
                            max_mint.unwrap_or(&BigInt::zero())
                        ));
                    }
                    Ok(_convert_to_assets(amount_raw, rate, Rounding::RoundUp))
                }
            }
        }
        WrappingDirection::Unwrap => {
            // Amount in is wrapped tokens, amount out is underlying tokens
            match kind {
                SwapKind::GivenIn => {
                    // previewRedeem
                    Ok(_convert_to_assets(amount_raw, rate, Rounding::RoundDown))
                }
                SwapKind::GivenOut => {
                    // previewWithdraw
                    Ok(_convert_to_shares(amount_raw, rate, Rounding::RoundUp))
                }
            }
        }
    }
}

/// Convert assets to shares
fn _convert_to_shares(assets: &BigInt, rate: &BigInt, rounding: Rounding) -> BigInt {
    match rounding {
        Rounding::RoundUp => div_up_fixed(assets, rate).unwrap_or_else(|_| BigInt::zero()),
        Rounding::RoundDown => div_down_fixed(assets, rate).unwrap_or_else(|_| BigInt::zero()),
    }
}

/// Convert shares to assets
fn _convert_to_assets(shares: &BigInt, rate: &BigInt, rounding: Rounding) -> BigInt {
    match rounding {
        Rounding::RoundUp => mul_up_fixed(shares, rate).unwrap_or_else(|_| BigInt::zero()),
        Rounding::RoundDown => mul_down_fixed(shares, rate).unwrap_or_else(|_| BigInt::zero()),
    }
}

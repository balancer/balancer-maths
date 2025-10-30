//! Mathematical utilities for fixed-point arithmetic

use crate::common::constants::{FOUR_WAD, MAX_POW_RELATIVE_ERROR, TWO_WAD, WAD};
use crate::common::errors::PoolError;
use crate::common::log_exp_math;
use alloy_primitives::U256;

/// Multiply two U256s and round up
pub fn mul_up_fixed(a: &U256, b: &U256) -> Result<U256, PoolError> {
    let product = a * b;
    if product.is_zero() {
        return Ok(U256::ZERO);
    }
    let result = (product - U256::ONE) / *WAD + U256::ONE;
    Ok(result)
}

/// Divide two U256s and round up
pub fn div_up_fixed(a: &U256, b: &U256) -> Result<U256, PoolError> {
    if a.is_zero() {
        return Ok(U256::ZERO);
    }
    if b.is_zero() {
        return Err(PoolError::MathOverflow);
    }

    let a_inflated = a * *WAD;
    let result = (a_inflated - U256::ONE) / b + U256::ONE;
    Ok(result)
}

/// Multiply two U256s and round down
pub fn mul_down_fixed(a: &U256, b: &U256) -> Result<U256, PoolError> {
    let product = a * b;
    let result = product / *WAD;
    Ok(result)
}

/// Divide two U256s and round down
pub fn div_down_fixed(a: &U256, b: &U256) -> Result<U256, PoolError> {
    if a.is_zero() {
        return Ok(U256::ZERO);
    }
    if b.is_zero() {
        return Err(PoolError::MathOverflow);
    }

    let a_inflated = a * *WAD;
    let result = a_inflated / b;
    Ok(result)
}

/// Divide and round up (raw division)
pub fn div_up(a: &U256, b: &U256) -> Result<U256, PoolError> {
    if b.is_zero() {
        return Ok(U256::ZERO);
    }
    let result = U256::ONE + (a - U256::ONE) / b;
    Ok(result)
}

/// Multiply and divide with up rounding
pub fn mul_div_up_fixed(a: &U256, b: &U256, c: &U256) -> Result<U256, PoolError> {
    let product = a * b;
    let result = (product - U256::ONE) / c + U256::ONE;
    Ok(result)
}

/// Calculate power with down rounding (default version 0)
pub fn pow_down_fixed(base: &U256, exponent: &U256) -> Result<U256, PoolError> {
    pow_down_fixed_with_version(base, exponent, 0)
}

/// Calculate power with down rounding with explicit version
pub fn pow_down_fixed_with_version(
    base: &U256,
    exponent: &U256,
    version: u32,
) -> Result<U256, PoolError> {
    if *exponent == *WAD && version != 1 {
        return Ok(*base);
    }
    if *exponent == *TWO_WAD && version != 1 {
        return mul_up_fixed(base, base);
    }
    if *exponent == *FOUR_WAD && version != 1 {
        let square = mul_up_fixed(base, base)?;
        return mul_up_fixed(&square, &square);
    }

    let raw = log_exp_math::pow(base, exponent)?;
    let max_error = mul_up_fixed(&raw, &MAX_POW_RELATIVE_ERROR)? + U256::ONE;

    if raw < max_error {
        return Ok(U256::ZERO);
    }

    Ok(raw - max_error)
}

/// Calculate power with up rounding (default version 0)
pub fn pow_up_fixed(base: &U256, exponent: &U256) -> Result<U256, PoolError> {
    pow_up_fixed_with_version(base, exponent, 0)
}

/// Calculate power with up rounding with explicit version
pub fn pow_up_fixed_with_version(
    base: &U256,
    exponent: &U256,
    version: u32,
) -> Result<U256, PoolError> {
    if *exponent == *WAD && version != 1 {
        return Ok(*base);
    }
    if *exponent == *TWO_WAD && version != 1 {
        return mul_up_fixed(base, base);
    }
    if *exponent == *FOUR_WAD && version != 1 {
        let square = mul_up_fixed(base, base)?;
        return mul_up_fixed(&square, &square);
    }

    let raw = log_exp_math::pow(base, exponent)?;
    let max_error = mul_up_fixed(&raw, &MAX_POW_RELATIVE_ERROR)? + U256::ONE;

    Ok(raw + max_error)
}

/// Calculate complement (1 - x) with fixed-point arithmetic
pub fn complement_fixed(x: &U256) -> Result<U256, PoolError> {
    if *x < *WAD {
        Ok(*WAD - x)
    } else {
        Ok(U256::ZERO)
    }
}

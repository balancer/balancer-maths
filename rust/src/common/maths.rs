//! Mathematical utilities for fixed-point arithmetic

use crate::common::constants::{FOUR_WAD, MAX_POW_RELATIVE_ERROR, TWO_WAD, WAD};
use crate::common::errors::PoolError;
use crate::common::log_exp_math;
use num_bigint::BigInt;
use num_traits::{One, Zero};

/// Multiply two BigInts and round up
pub fn mul_up_fixed(a: &BigInt, b: &BigInt) -> Result<BigInt, PoolError> {
    let product = a * b;
    if product.is_zero() {
        return Ok(BigInt::zero());
    }
    let result = (product - BigInt::one()) / &*WAD + BigInt::one();
    Ok(result)
}

/// Divide two BigInts and round up
pub fn div_up_fixed(a: &BigInt, b: &BigInt) -> Result<BigInt, PoolError> {
    if a.is_zero() {
        return Ok(BigInt::zero());
    }
    if b.is_zero() {
        return Err(PoolError::MathOverflow);
    }

    let a_inflated = a * &*WAD;
    let result = (&a_inflated - BigInt::one()) / b + BigInt::one();
    Ok(result)
}

/// Multiply two BigInts and round down
pub fn mul_down_fixed(a: &BigInt, b: &BigInt) -> Result<BigInt, PoolError> {
    let product = a * b;
    let result = product / &*WAD;
    Ok(result)
}

/// Divide two BigInts and round down
pub fn div_down_fixed(a: &BigInt, b: &BigInt) -> Result<BigInt, PoolError> {
    if a.is_zero() {
        return Ok(BigInt::zero());
    }
    if b.is_zero() {
        return Err(PoolError::MathOverflow);
    }

    let a_inflated = a * &*WAD;
    let result = a_inflated.clone() / b;
    Ok(result)
}

/// Divide and round up (raw division)
pub fn div_up(a: &BigInt, b: &BigInt) -> Result<BigInt, PoolError> {
    if b.is_zero() {
        return Ok(BigInt::zero());
    }
    let result = BigInt::one() + (a - &BigInt::one()) / b;
    Ok(result)
}

/// Multiply and divide with up rounding
pub fn mul_div_up_fixed(a: &BigInt, b: &BigInt, c: &BigInt) -> Result<BigInt, PoolError> {
    let product = a * b;
    let result = (&product - &BigInt::one()) / c + &BigInt::one();
    Ok(result)
}

/// Calculate power with down rounding (default version 0)
pub fn pow_down_fixed(base: &BigInt, exponent: &BigInt) -> Result<BigInt, PoolError> {
    pow_down_fixed_with_version(base, exponent, 0)
}

/// Calculate power with down rounding with explicit version
pub fn pow_down_fixed_with_version(
    base: &BigInt,
    exponent: &BigInt,
    version: u32,
) -> Result<BigInt, PoolError> {
    if exponent == &*WAD && version != 1 {
        return Ok(base.clone());
    }
    if exponent == &*TWO_WAD && version != 1 {
        return mul_up_fixed(base, base);
    }
    if exponent == &*FOUR_WAD && version != 1 {
        let square = mul_up_fixed(base, base)?;
        return mul_up_fixed(&square, &square);
    }

    let raw = log_exp_math::pow(base, exponent)?;
    let max_error = mul_up_fixed(&raw, &MAX_POW_RELATIVE_ERROR)? + &BigInt::one();

    if raw < max_error {
        return Ok(BigInt::zero());
    }

    Ok(raw - max_error)
}

/// Calculate power with up rounding (default version 0)
pub fn pow_up_fixed(base: &BigInt, exponent: &BigInt) -> Result<BigInt, PoolError> {
    pow_up_fixed_with_version(base, exponent, 0)
}

/// Calculate power with up rounding with explicit version
pub fn pow_up_fixed_with_version(
    base: &BigInt,
    exponent: &BigInt,
    version: u32,
) -> Result<BigInt, PoolError> {
    if exponent == &*WAD && version != 1 {
        return Ok(base.clone());
    }
    if exponent == &*TWO_WAD && version != 1 {
        return mul_up_fixed(base, base);
    }
    if exponent == &*FOUR_WAD && version != 1 {
        let square = mul_up_fixed(base, base)?;
        return mul_up_fixed(&square, &square);
    }

    let raw = log_exp_math::pow(base, exponent)?;
    let max_error = mul_up_fixed(&raw, &MAX_POW_RELATIVE_ERROR)? + &BigInt::one();

    Ok(raw + max_error)
}

/// Calculate complement (1 - x) with fixed-point arithmetic
pub fn complement_fixed(x: &BigInt) -> Result<BigInt, PoolError> {
    if x < &*WAD {
        Ok(&*WAD - x)
    } else {
        Ok(BigInt::zero())
    }
}

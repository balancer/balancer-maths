//! Logarithmic and exponential math utilities for fixed-point arithmetic
use crate::common::errors::PoolError;
use alloy_primitives::I256;
use alloy_primitives::U256;
use lazy_static::lazy_static;
use std::str::FromStr;

lazy_static! {
    // Constants for LogExpMath
    static ref ONE_18: I256 = I256::from_str("1000000000000000000").unwrap();
    static ref MAX_NATURAL_EXPONENT: I256 = I256::from_str("130000000000000000000").unwrap();
    static ref MIN_NATURAL_EXPONENT: I256 = I256::from_str("-41000000000000000000").unwrap();
    static ref LN_36_LOWER_BOUND: I256 = I256::from_str("900000000000000000").unwrap();
    static ref LN_36_UPPER_BOUND: I256 = I256::from_str("1100000000000000000").unwrap();
    // Precomputed value of 2^254 / HUNDRED_WAD
    static ref MILD_EXPONENT_BOUND: U256 = U256::from_str("289480223093290488558927462521719769633174961664101410098").unwrap();

    // RAY constant for 36 decimal precision
    static ref RAY: I256 = I256::from_str("1000000000000000000000000000000000000").unwrap();

    // 18 decimal constants
    static ref X0: I256 = I256::from_str("128000000000000000000").unwrap(); // 2^7
    static ref A0: I256 = I256::from_str("38877084059945950922200000000000000000000000000000000000").unwrap(); // e^(x0) (no decimals)
    static ref X1: I256 = I256::from_str("64000000000000000000").unwrap(); // 2^6
    static ref A1: I256 = I256::from_str("6235149080811616882910000000").unwrap(); // e^(x1) (no decimals)

    // 20 decimal constants
    static ref X2: I256 = I256::from_str("3200000000000000000000").unwrap(); // 2^5
    static ref A2: I256 = I256::from_str("7896296018268069516100000000000000").unwrap(); // e^(x2)
    static ref X3: I256 = I256::from_str("1600000000000000000000").unwrap(); // 2^4
    static ref A3: I256 = I256::from_str("888611052050787263676000000").unwrap(); // e^(x3)
    static ref X4: I256 = I256::from_str("800000000000000000000").unwrap(); // 2^3
    static ref A4: I256 = I256::from_str("298095798704172827474000").unwrap(); // e^(x4)
    static ref X5: I256 = I256::from_str("400000000000000000000").unwrap(); // 2^2
    static ref A5: I256 = I256::from_str("5459815003314423907810").unwrap(); // e^(x5)
    static ref X6: I256 = I256::from_str("200000000000000000000").unwrap(); // 2^1
    static ref A6: I256 = I256::from_str("738905609893065022723").unwrap(); // e^(x6)
    static ref X7: I256 = I256::from_str("100000000000000000000").unwrap(); // 2^0
    static ref A7: I256 = I256::from_str("271828182845904523536").unwrap(); // e^(x7)
    static ref X8: I256 = I256::from_str("50000000000000000000").unwrap(); // 2^-1
    static ref A8: I256 = I256::from_str("164872127070012814685").unwrap(); // e^(x8)
    static ref X9: I256 = I256::from_str("25000000000000000000").unwrap(); // 2^-2
    static ref A9: I256 = I256::from_str("128402541668774148407").unwrap(); // e^(x9)
    static ref X10: I256 = I256::from_str("12500000000000000000").unwrap(); // 2^-3
    static ref A10: I256 = I256::from_str("113314845306682631683").unwrap(); // e^(x10)
    static ref X11: I256 = I256::from_str("6250000000000000000").unwrap(); // 2^-4
    static ref A11: I256 = I256::from_str("106449445891785942956").unwrap(); // e^(x11)

    static ref ONE_20: I256 = I256::from_str("100000000000000000000").unwrap();
}

/// Calculate x^y using logarithmic and exponential properties
pub fn pow(x: &U256, y: &U256) -> Result<U256, PoolError> {
    if y.is_zero() {
        // We solve the 0^0 indetermination by making it equal one.
        return Ok(ONE_18.into_raw());
    }

    if x.is_zero() {
        return Ok(U256::ZERO);
    }

    let x_int256 = I256::from_raw(*x);

    // This prevents y * ln(x) from overflowing, and at the same time guarantees y fits in the signed 256 bit range.
    if y >= &*MILD_EXPONENT_BOUND {
        return Err(PoolError::MathOverflow);
    }
    let y_int256 = I256::from_raw(*y);

    let logx_times_y = if x_int256 > *LN_36_LOWER_BOUND && x_int256 < *LN_36_UPPER_BOUND {
        let ln_36_x = ln_36(&x_int256)?;
        // ln_36_x has 36 decimal places, so multiplying by y_int256 isn't as straightforward, since we can't just
        // bring y_int256 to 36 decimal places, as it might overflow. Instead, we perform two 18 decimal
        // multiplications and add the results: one with the first 18 decimals of ln_36_x, and one with the
        // (downscaled) last 18 decimals.
        (ln_36_x / *ONE_18) * y_int256 + ((ln_36_x % *ONE_18) * y_int256) / *ONE_18
    } else {
        ln(&x_int256)? * y_int256
    };

    let logx_times_y = logx_times_y / *ONE_18;

    // Finally, we compute exp(y * ln(x)) to arrive at x^y
    if logx_times_y < *MIN_NATURAL_EXPONENT || logx_times_y > *MAX_NATURAL_EXPONENT {
        return Err(PoolError::MathOverflow);
    }

    exp(&logx_times_y).map(|result| result.into_raw())
}

/// Calculate exponential function e^x
fn exp(x: &I256) -> Result<I256, PoolError> {
    if x < &MIN_NATURAL_EXPONENT || x > &MAX_NATURAL_EXPONENT {
        return Err(PoolError::MathOverflow);
    }

    if x.is_negative() {
        // We only handle positive exponents: e^(-x) is computed as 1 / e^x. We can safely make x positive since it
        // fits in the signed 256 bit range (as it is larger than MIN_NATURAL_EXPONENT).
        // Fixed point division requires multiplying by ONE_18.
        return Ok((*ONE_18 * *ONE_18) / exp(&(-*x))?);
    }

    let mut x = *x;
    let first_an = if x >= *X0 {
        x -= *X0;
        *A0
    } else if x >= *X1 {
        x -= *X1;
        *A1
    } else {
        I256::ONE
    };

    // We now transform x into a 20 decimal fixed point number, to have enhanced precision when computing the
    // smaller terms.
    x *= I256::from_str("100").unwrap();

    // `product` is the accumulated product of all a_n (except a0 and a1), which starts at 20 decimal fixed point
    // one. Recall that fixed point multiplication requires dividing by ONE_20.
    let mut product = *ONE_20;

    if x >= *X2 {
        x -= *X2;
        product = (product * *A2) / *ONE_20;
    }
    if x >= *X3 {
        x -= *X3;
        product = (product * *A3) / *ONE_20;
    }
    if x >= *X4 {
        x -= *X4;
        product = (product * *A4) / *ONE_20;
    }
    if x >= *X5 {
        x -= *X5;
        product = (product * *A5) / *ONE_20;
    }
    if x >= *X6 {
        x -= *X6;
        product = (product * *A6) / *ONE_20;
    }
    if x >= *X7 {
        x -= *X7;
        product = (product * *A7) / *ONE_20;
    }
    if x >= *X8 {
        x -= *X8;
        product = (product * *A8) / *ONE_20;
    }
    if x >= *X9 {
        x -= *X9;
        product = (product * *A9) / *ONE_20;
    }

    // x10 and x11 are unnecessary here since we have high enough precision already.

    // Now we need to compute e^x, where x is small (in particular, it is smaller than x9). We use the Taylor series
    // expansion for e^x: 1 + x + (x^2 / 2!) + (x^3 / 3!) + ... + (x^n / n!).

    let mut series_sum = *ONE_20; // The initial one in the sum, with 20 decimal places.
    let mut term = x; // Each term in the sum, where the nth term is (x^n / n!).

    // The first term is simply x.
    series_sum += term;

    // Each term (x^n / n!) equals the previous one times x, divided by n. Since x is a fixed point number,
    // multiplying by it requires dividing by HUNDRED_WAD, but dividing by the non-fixed point n values does not.

    term = (term * x) / *ONE_20 / I256::from_str("2").unwrap();
    series_sum += term;

    term = (term * x) / *ONE_20 / I256::from_str("3").unwrap();
    series_sum += term;

    term = (term * x) / *ONE_20 / I256::from_str("4").unwrap();
    series_sum += term;

    term = (term * x) / *ONE_20 / I256::from_str("5").unwrap();
    series_sum += term;

    term = (term * x) / *ONE_20 / I256::from_str("6").unwrap();
    series_sum += term;

    term = (term * x) / *ONE_20 / I256::from_str("7").unwrap();
    series_sum += term;

    term = (term * x) / *ONE_20 / I256::from_str("8").unwrap();
    series_sum += term;

    term = (term * x) / *ONE_20 / I256::from_str("9").unwrap();
    series_sum += term;

    term = (term * x) / *ONE_20 / I256::from_str("10").unwrap();
    series_sum += term;

    term = (term * x) / *ONE_20 / I256::from_str("11").unwrap();
    series_sum += term;

    term = (term * x) / *ONE_20 / I256::from_str("12").unwrap();
    series_sum += term;

    // 12 Taylor terms are sufficient for 18 decimal precision.

    // Finally, we multiply by 2^7 / 2^7 = 1 and add all the terms up to compute the result.
    // If the first argument is 0 (x = 0), then we want the result to be 1, as e^0 = 1.
    let result = ((product * series_sum) / *ONE_20) * first_an / I256::from_str("100").unwrap();

    Ok(result)
}

/// Calculate natural logarithm ln(x) with signed 18 decimal fixed point argument
fn ln(x: &I256) -> Result<I256, PoolError> {
    let mut a = *x;

    if a < *ONE_18 {
        // Since ln(a^k) = k * ln(a), we can compute ln(a) as ln(a) = ln((1/a)^(-1)) = - ln((1/a)). If a is less
        // than one, 1/a will be greater than one, and this if statement will not be entered in the recursive call.
        // Fixed point division requires multiplying by ONE_18.
        return Ok(I256::MINUS_ONE * ln(&((*ONE_18 * *ONE_18) / a))?);
    }

    // First, we use the fact that ln^(a * b) = ln(a) + ln(b) to decompose ln(a) into a sum of powers of two, which
    // we call x_n, where x_n == 2^(7 - n), which are the natural logarithm of precomputed quantities a_n (that is,
    // ln(a_n) = x_n). We choose the first x_n, x0, to equal 2^7 because the exponential of all larger powers cannot
    // be represented as 18 fixed point decimal numbers in 256 bits, and are therefore larger than a.
    // At the end of this process we will have the sum of all x_n = ln(a_n) that apply, and the remainder of this
    // decomposition, which will be lower than the smallest a_n.
    // ln(a) = k_0 * x_0 + k_1 * x_1 + ... + k_n * x_n + ln(remainder), where each k_n equals either 0 or 1.
    // We mutate a by subtracting a_n, making it the remainder of the decomposition.

    // For reasons related to how `exp` works, the first two a_n (e^(2^7) and e^(2^6)) are not stored as fixed point
    // numbers with 18 decimals, but instead as plain integers with 0 decimals, so we need to multiply them by
    // ONE_18 to convert them to fixed point.
    // For each a_n, we test if that term is present in the decomposition (if a is larger than it), and if so divide
    // by it and compute the accumulated sum.

    let mut sum = I256::ZERO;
    if a >= (*A0 * *ONE_18) {
        a /= *A0; // Integer, not fixed point division
        sum += *X0;
    }

    if a >= (*A1 * *ONE_18) {
        a /= *A1; // Integer, not fixed point division
        sum += *X1;
    }

    // All other a_n and x_n are stored as 20 digit fixed point numbers, so we convert the sum and a to this format.
    sum *= I256::from_str("100").unwrap();
    a *= I256::from_str("100").unwrap();

    // Because further a_n are 20 digit fixed point numbers, we multiply by ONE_20 when dividing by them.

    if a >= *A2 {
        a = (a * *ONE_20) / *A2;
        sum += *X2;
    }

    if a >= *A3 {
        a = (a * *ONE_20) / *A3;
        sum += *X3;
    }

    if a >= *A4 {
        a = (a * *ONE_20) / *A4;
        sum += *X4;
    }

    if a >= *A5 {
        a = (a * *ONE_20) / *A5;
        sum += *X5;
    }

    if a >= *A6 {
        a = (a * *ONE_20) / *A6;
        sum += *X6;
    }

    if a >= *A7 {
        a = (a * *ONE_20) / *A7;
        sum += *X7;
    }

    if a >= *A8 {
        a = (a * *ONE_20) / *A8;
        sum += *X8;
    }

    if a >= *A9 {
        a = (a * *ONE_20) / *A9;
        sum += *X9;
    }

    if a >= *A10 {
        a = (a * *ONE_20) / *A10;
        sum += *X10;
    }

    if a >= *A11 {
        a = (a * *ONE_20) / *A11;
        sum += *X11;
    }

    // a is now a small number (smaller than a_11, which roughly equals 1.06). This means we can use a Taylor series
    // that converges rapidly for values of `a` close to one - the same one used in ln_36.
    // Let z = (a - 1) / (a + 1).
    // ln(a) = 2 * (z + z^3 / 3 + z^5 / 5 + z^7 / 7 + ... + z^(2 * n + 1) / (2 * n + 1))

    // Recall that 20 digit fixed point division requires multiplying by ONE_20, and multiplication requires
    // division by ONE_20.
    let z = ((a - *ONE_20) * *ONE_20) / (a + *ONE_20);
    let z_squared = (z * z) / *ONE_20;

    // num is the numerator of the series: the z^(2 * n + 1) term
    let mut num = z;

    // seriesSum holds the accumulated sum of each term in the series, starting with the initial z
    let mut series_sum = num;

    // In each step, the numerator is multiplied by z^2
    num = (num * z_squared) / *ONE_20;
    series_sum += num / I256::from_str("3").unwrap();

    num = (num * z_squared) / *ONE_20;
    series_sum += num / I256::from_str("5").unwrap();

    num = (num * z_squared) / *ONE_20;
    series_sum += num / I256::from_str("7").unwrap();

    num = (num * z_squared) / *ONE_20;
    series_sum += num / I256::from_str("9").unwrap();

    num = (num * z_squared) / *ONE_20;
    series_sum += num / I256::from_str("11").unwrap();

    // 6 Taylor terms are sufficient for 36 decimal precision.

    // Finally, we multiply by 2 (non fixed point) to compute ln(remainder)
    series_sum *= I256::from_str("2").unwrap();

    // We now have the sum of all x_n present, and the Taylor approximation of the logarithm of the remainder (both
    // with 20 decimals). All that remains is to sum these two, and then drop two digits to return a 18 decimal
    // value.

    Ok((sum + series_sum) / I256::from_str("100").unwrap())
}

/// Calculate natural logarithm with 36 decimal precision
fn ln_36(x: &I256) -> Result<I256, PoolError> {
    let mut x = *x;
    // Since ln(1) = 0, a value of x close to one will yield a very small result, which makes using 36 digits
    // worthwhile.

    // First, we transform x to a 36 digit fixed point value.
    x *= *ONE_18;

    // We will use the following Taylor expansion, which converges very rapidly. Let z = (x - 1) / (x + 1).
    // ln(x) = 2 * (z + z^3 / 3 + z^5 / 5 + z^7 / 7 + ... + z^(2 * n + 1) / (2 * n + 1))

    // Recall that 36 digit fixed point division requires multiplying by ONE_36, and multiplication requires
    // division by ONE_36.
    let z = ((x - *RAY) * *RAY) / (x + *RAY);
    let z_squared = (z * z) / *RAY;

    // num is the numerator of the series: the z^(2 * n + 1) term
    let mut num = z;

    // seriesSum holds the accumulated sum of each term in the series, starting with the initial z
    let mut series_sum = num;

    // In each step, the numerator is multiplied by z^2
    num = (num * z_squared) / *RAY;
    series_sum += num / I256::from_str("3").unwrap();

    num = (num * z_squared) / *RAY;
    series_sum += num / I256::from_str("5").unwrap();

    num = (num * z_squared) / *RAY;
    series_sum += num / I256::from_str("7").unwrap();

    num = (num * z_squared) / *RAY;
    series_sum += num / I256::from_str("9").unwrap();

    num = (num * z_squared) / *RAY;
    series_sum += num / I256::from_str("11").unwrap();

    num = (num * z_squared) / *RAY;
    series_sum += num / I256::from_str("13").unwrap();

    num = (num * z_squared) / *RAY;
    series_sum += num / I256::from_str("15").unwrap();

    // 8 Taylor terms are sufficient for 36 decimal precision.

    // All that remains is multiplying by 2 (non fixed point).
    Ok(series_sum * I256::from_str("2").unwrap())
}

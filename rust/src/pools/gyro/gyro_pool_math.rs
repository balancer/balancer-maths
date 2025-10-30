use crate::common::constants::WAD;
use crate::common::maths::{mul_down_fixed, mul_up_fixed};
use alloy_primitives::U256;
use lazy_static::lazy_static;

lazy_static! {
    // Square root constants for different precision levels
    static ref SQRT_1E_NEG_1: U256 = U256::from(316227766016837933u64);
    static ref SQRT_1E_NEG_3: U256 = U256::from(31622776601683793u64);
    static ref SQRT_1E_NEG_5: U256 = U256::from(3162277660168379u64);
    static ref SQRT_1E_NEG_7: U256 = U256::from(316227766016837u64);
    static ref SQRT_1E_NEG_9: U256 = U256::from(31622776601683u64);
    static ref SQRT_1E_NEG_11: U256 = U256::from(3162277660168u64);
    static ref SQRT_1E_NEG_13: U256 = U256::from(316227766016u64);
    static ref SQRT_1E_NEG_15: U256 = U256::from(31622776601u64);
    static ref SQRT_1E_NEG_17: U256 = U256::from(3162277660u64);
}

/// Implements a square root algorithm using Newton's method and a first-guess optimization.
/// Based on the Python implementation in gyro_pool_math.py
pub fn gyro_pool_math_sqrt(x: &U256, tolerance: u64) -> U256 {
    if x.is_zero() {
        return U256::ZERO;
    }

    let mut guess = make_initial_guess(x);

    // Perform Newton's method iterations
    for _ in 0..7 {
        guess = (guess + (x * *WAD) / guess) / U256::from(2u64);
    }

    // Check that squaredGuess (guess * guess) is close enough from input
    let guess_squared =
        mul_down_fixed(&guess, &guess).unwrap_or_else(|_| panic!("mul_down_fixed failed"));
    let tolerance_bigint = U256::from(tolerance);

    let upper_bound = x + &mul_up_fixed(&guess, &tolerance_bigint)
        .unwrap_or_else(|_| panic!("mul_up_fixed failed"));
    let lower_bound = x - &mul_up_fixed(&guess, &tolerance_bigint)
        .unwrap_or_else(|_| panic!("mul_up_fixed failed"));

    if !(guess_squared <= upper_bound && guess_squared >= lower_bound) {
        panic!("_sqrt FAILED");
    }

    guess
}

/// Makes an initial guess for the square root calculation
fn make_initial_guess(x: &U256) -> U256 {
    if x >= &*WAD {
        let x_div_wad = x / *WAD;
        let log2_halved = int_log2_halved(&x_div_wad);
        (U256::ONE << log2_halved) * *WAD
    } else if x <= &U256::from(10u64) {
        SQRT_1E_NEG_17.clone()
    } else if x <= &U256::from(100u64) {
        U256::from(10_000_000_000u64)
    } else if x <= &U256::from(1000u64) {
        SQRT_1E_NEG_15.clone()
    } else if x <= &U256::from(10000u64) {
        U256::from(100_000_000_000u64)
    } else if x <= &U256::from(100000u64) {
        SQRT_1E_NEG_13.clone()
    } else if x <= &U256::from(1000000u64) {
        U256::from(1_000_000_000_000u64)
    } else if x <= &U256::from(10000000u64) {
        SQRT_1E_NEG_11.clone()
    } else if x <= &U256::from(100000000u64) {
        U256::from(10_000_000_000_000u64)
    } else if x <= &U256::from(1000000000u64) {
        SQRT_1E_NEG_9.clone()
    } else if x <= &U256::from(10000000000u64) {
        U256::from(100_000_000_000_000u64)
    } else if x <= &U256::from(100000000000u64) {
        SQRT_1E_NEG_7.clone()
    } else if x <= &U256::from(1000000000000u64) {
        U256::from(1_000_000_000_000_000u64)
    } else if x <= &U256::from(10000000000000u64) {
        SQRT_1E_NEG_5.clone()
    } else if x <= &U256::from(100000000000000u64) {
        U256::from(10_000_000_000_000_000u64)
    } else if x <= &U256::from(1000000000000000u64) {
        SQRT_1E_NEG_3.clone()
    } else if x <= &U256::from(10000000000000000u64) {
        U256::from(100_000_000_000_000_000u64)
    } else if x <= &U256::from(100000000000000000u64) {
        SQRT_1E_NEG_1.clone()
    } else {
        x.clone()
    }
}

/// Calculates the integer logarithm base 2 divided by 2
fn int_log2_halved(x: &U256) -> u64 {
    let mut n = 0u64;
    let mut local_x = x.clone();

    if local_x >= U256::ONE << 128 {
        local_x >>= 128;
        n += 64;
    }
    if local_x >= U256::ONE << 64 {
        local_x >>= 64;
        n += 32;
    }
    if local_x >= U256::ONE << 32 {
        local_x >>= 32;
        n += 16;
    }
    if local_x >= U256::ONE << 16 {
        local_x >>= 16;
        n += 8;
    }
    if local_x >= U256::ONE << 8 {
        local_x >>= 8;
        n += 4;
    }
    if local_x >= U256::ONE << 4 {
        local_x >>= 4;
        n += 2;
    }
    if local_x >= U256::ONE << 2 {
        local_x >>= 2;
        n += 1;
    }

    n
}

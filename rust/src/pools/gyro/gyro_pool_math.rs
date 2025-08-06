use num_bigint::BigInt;
use num_traits::Zero;
use lazy_static::lazy_static;
use crate::common::maths::{mul_down_fixed, mul_up_fixed};
use crate::common::constants::WAD;

lazy_static! {
    // Square root constants for different precision levels
    static ref SQRT_1E_NEG_1: BigInt = BigInt::from(316227766016837933u64);
    static ref SQRT_1E_NEG_3: BigInt = BigInt::from(31622776601683793u64);
    static ref SQRT_1E_NEG_5: BigInt = BigInt::from(3162277660168379u64);
    static ref SQRT_1E_NEG_7: BigInt = BigInt::from(316227766016837u64);
    static ref SQRT_1E_NEG_9: BigInt = BigInt::from(31622776601683u64);
    static ref SQRT_1E_NEG_11: BigInt = BigInt::from(3162277660168u64);
    static ref SQRT_1E_NEG_13: BigInt = BigInt::from(316227766016u64);
    static ref SQRT_1E_NEG_15: BigInt = BigInt::from(31622776601u64);
    static ref SQRT_1E_NEG_17: BigInt = BigInt::from(3162277660u64);
}

/// Implements a square root algorithm using Newton's method and a first-guess optimization.
/// Based on the Python implementation in gyro_pool_math.py
pub fn gyro_pool_math_sqrt(x: &BigInt, tolerance: u64) -> BigInt {
    if x.is_zero() {
        return BigInt::zero();
    }

    let mut guess = make_initial_guess(x);

    // Perform Newton's method iterations
    for _ in 0..7 {
        guess = (&guess + (x * &*WAD) / &guess) / BigInt::from(2u64);
    }

    // Check that squaredGuess (guess * guess) is close enough from input
    let guess_squared = mul_down_fixed(&guess, &guess).unwrap_or_else(|_| panic!("mul_down_fixed failed"));
    let tolerance_bigint = BigInt::from(tolerance);
    
    let upper_bound = x + &mul_up_fixed(&guess, &tolerance_bigint).unwrap_or_else(|_| panic!("mul_up_fixed failed"));
    let lower_bound = x - &mul_up_fixed(&guess, &tolerance_bigint).unwrap_or_else(|_| panic!("mul_up_fixed failed"));
    
    if !(guess_squared <= upper_bound && guess_squared >= lower_bound) {
        panic!("_sqrt FAILED");
    }

    guess
}

/// Makes an initial guess for the square root calculation
fn make_initial_guess(x: &BigInt) -> BigInt {
    if x >= &*WAD {
        let x_div_wad = x / &*WAD;
        let log2_halved = int_log2_halved(&x_div_wad);
        (BigInt::from(1u64) << log2_halved) * &*WAD
    } else {
        if x <= &BigInt::from(10u64) {
            SQRT_1E_NEG_17.clone()
        } else if x <= &BigInt::from(100u64) {
            BigInt::from(10_000_000_000u64)
        } else if x <= &BigInt::from(1000u64) {
            SQRT_1E_NEG_15.clone()
        } else if x <= &BigInt::from(10000u64) {
            BigInt::from(100_000_000_000u64)
        } else if x <= &BigInt::from(100000u64) {
            SQRT_1E_NEG_13.clone()
        } else if x <= &BigInt::from(1000000u64) {
            BigInt::from(1_000_000_000_000u64)
        } else if x <= &BigInt::from(10000000u64) {
            SQRT_1E_NEG_11.clone()
        } else if x <= &BigInt::from(100000000u64) {
            BigInt::from(10_000_000_000_000u64)
        } else if x <= &BigInt::from(1000000000u64) {
            SQRT_1E_NEG_9.clone()
        } else if x <= &BigInt::from(10000000000u64) {
            BigInt::from(100_000_000_000_000u64)
        } else if x <= &BigInt::from(100000000000u64) {
            SQRT_1E_NEG_7.clone()
        } else if x <= &BigInt::from(1000000000000u64) {
            BigInt::from(1_000_000_000_000_000u64)
        } else if x <= &BigInt::from(10000000000000u64) {
            SQRT_1E_NEG_5.clone()
        } else if x <= &BigInt::from(100000000000000u64) {
            BigInt::from(10_000_000_000_000_000u64)
        } else if x <= &BigInt::from(1000000000000000u64) {
            SQRT_1E_NEG_3.clone()
        } else if x <= &BigInt::from(10000000000000000u64) {
            BigInt::from(100_000_000_000_000_000u64)
        } else if x <= &BigInt::from(100000000000000000u64) {
            SQRT_1E_NEG_1.clone()
        } else {
            x.clone()
        }
    }
}

/// Calculates the integer logarithm base 2 divided by 2
fn int_log2_halved(x: &BigInt) -> u64 {
    let mut n = 0u64;
    let mut local_x = x.clone();

    if local_x >= BigInt::from(1u64) << 128 {
        local_x >>= 128;
        n += 64;
    }
    if local_x >= BigInt::from(1u64) << 64 {
        local_x >>= 64;
        n += 32;
    }
    if local_x >= BigInt::from(1u64) << 32 {
        local_x >>= 32;
        n += 16;
    }
    if local_x >= BigInt::from(1u64) << 16 {
        local_x >>= 16;
        n += 8;
    }
    if local_x >= BigInt::from(1u64) << 8 {
        local_x >>= 8;
        n += 4;
    }
    if local_x >= BigInt::from(1u64) << 4 {
        local_x >>= 4;
        n += 2;
    }
    if local_x >= BigInt::from(1u64) << 2 {
        local_x >>= 2;
        n += 1;
    }

    n
} 
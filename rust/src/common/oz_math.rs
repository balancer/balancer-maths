use num_bigint::BigInt;
use num_traits::Zero;

/// Computes the integer square root of a number using Newton's method
/// Ported from OpenZeppelin's Solidity library to Rust
/// @param a The input number (must be a non-negative integer)
/// @returns The integer square root of a
pub fn sqrt(a: &BigInt) -> BigInt {
    // Handle edge cases when a is 0 or 1
    if a <= &BigInt::from(1u64) {
        return a.clone();
    }

    // Find an initial approximation using bit manipulation
    // This approximation is close to 2^(log2(a)/2)
    let mut aa = a.clone();
    let mut xn = BigInt::from(1u64);

    // Check if aa >= 2^128
    let two_128 = BigInt::from(1u128) << 128;
    if aa >= two_128 {
        aa >>= 128;
        xn <<= 64;
    }
    
    // Check if aa >= 2^64
    let two_64 = BigInt::from(1u64) << 64;
    if aa >= two_64 {
        aa >>= 64;
        xn <<= 32;
    }
    
    // Check if aa >= 2^32
    let two_32 = BigInt::from(1u32) << 32;
    if aa >= two_32 {
        aa >>= 32;
        xn <<= 16;
    }
    
    // Check if aa >= 2^16
    let two_16 = BigInt::from(1u16) << 16;
    if aa >= two_16 {
        aa >>= 16;
        xn <<= 8;
    }
    
    // Check if aa >= 2^8
    let two_8 = BigInt::from(1u8) << 8;
    if aa >= two_8 {
        aa >>= 8;
        xn <<= 4;
    }
    
    // Check if aa >= 2^4
    let two_4 = BigInt::from(1u8) << 4;
    if aa >= two_4 {
        aa >>= 4;
        xn <<= 2;
    }
    
    // Check if aa >= 2^2
    let two_2 = BigInt::from(1u8) << 2;
    if aa >= two_2 {
        xn <<= 1;
    }

    // Refine the initial approximation
    xn = (&xn * 3) >> 1;

    // Apply Newton's method iterations
    // Each iteration approximately doubles the number of correct bits
    xn = (&xn + &(a / &xn)) >> 1;
    xn = (&xn + &(a / &xn)) >> 1;
    xn = (&xn + &(a / &xn)) >> 1;
    xn = (&xn + &(a / &xn)) >> 1;
    xn = (&xn + &(a / &xn)) >> 1;

    // Final adjustment: if xn > sqrt(a), decrement by 1
    if &xn > &(a / &xn) {
        xn - 1
    } else {
        xn
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sqrt_edge_cases() {
        assert_eq!(sqrt(&BigInt::from(0u64)), BigInt::from(0u64));
        assert_eq!(sqrt(&BigInt::from(1u64)), BigInt::from(1u64));
    }

    #[test]
    fn test_sqrt_perfect_squares() {
        assert_eq!(sqrt(&BigInt::from(4u64)), BigInt::from(2u64));
        assert_eq!(sqrt(&BigInt::from(9u64)), BigInt::from(3u64));
        assert_eq!(sqrt(&BigInt::from(16u64)), BigInt::from(4u64));
        assert_eq!(sqrt(&BigInt::from(25u64)), BigInt::from(5u64));
        assert_eq!(sqrt(&BigInt::from(100u64)), BigInt::from(10u64));
    }

    #[test]
    fn test_sqrt_non_perfect_squares() {
        assert_eq!(sqrt(&BigInt::from(2u64)), BigInt::from(1u64));
        assert_eq!(sqrt(&BigInt::from(3u64)), BigInt::from(1u64));
        assert_eq!(sqrt(&BigInt::from(5u64)), BigInt::from(2u64));
        assert_eq!(sqrt(&BigInt::from(8u64)), BigInt::from(2u64));
        assert_eq!(sqrt(&BigInt::from(15u64)), BigInt::from(3u64));
        assert_eq!(sqrt(&BigInt::from(24u64)), BigInt::from(4u64));
        assert_eq!(sqrt(&BigInt::from(35u64)), BigInt::from(5u64));
    }

    #[test]
    fn test_sqrt_large_numbers() {
        let large_number = BigInt::from(1000000000000000000u64); // 10^18
        let expected = BigInt::from(3162277660168379u64); // sqrt(10^18)
        assert_eq!(sqrt(&large_number), expected);
    }
} 
use alloy_primitives::U256;

/// Computes the integer square root of a number using Newton's method
/// Ported from OpenZeppelin's Solidity library to Rust
/// @param a The input number (must be a non-negative integer)
/// @returns The integer square root of a
pub fn sqrt(a: &U256) -> U256 {
    // Handle edge cases when a is 0 or 1
    if a <= &U256::ONE {
        return a.clone();
    }

    // Find an initial approximation using bit manipulation
    // This approximation is close to 2^(log2(a)/2)
    let mut aa = a.clone();
    let mut xn = U256::ONE;

    // Check if aa >= 2^128
    let two_128 = U256::ONE << 128;
    if aa >= two_128 {
        aa >>= 128;
        xn <<= 64;
    }

    // Check if aa >= 2^64
    let two_64 = U256::ONE << 64;
    if aa >= two_64 {
        aa >>= 64;
        xn <<= 32;
    }

    // Check if aa >= 2^32
    let two_32 = U256::ONE << 32;
    if aa >= two_32 {
        aa >>= 32;
        xn <<= 16;
    }

    // Check if aa >= 2^16
    let two_16 = U256::ONE << 16;
    if aa >= two_16 {
        aa >>= 16;
        xn <<= 8;
    }

    // Check if aa >= 2^8
    let two_8 = U256::ONE << 8;
    if aa >= two_8 {
        aa >>= 8;
        xn <<= 4;
    }

    // Check if aa >= 2^4
    let two_4 = U256::ONE << 4;
    if aa >= two_4 {
        aa >>= 4;
        xn <<= 2;
    }

    // Check if aa >= 2^2
    let two_2 = U256::ONE << 2;
    if aa >= two_2 {
        xn <<= 1;
    }

    // Refine the initial approximation
    xn = (&xn * U256::from(3)) >> 1;

    // Apply Newton's method iterations
    // Each iteration approximately doubles the number of correct bits
    xn = (&xn + &(a / &xn)) >> 1;
    xn = (&xn + &(a / &xn)) >> 1;
    xn = (&xn + &(a / &xn)) >> 1;
    xn = (&xn + &(a / &xn)) >> 1;
    xn = (&xn + &(a / &xn)) >> 1;

    // Final adjustment: if xn > sqrt(a), decrement by 1
    if xn > (a / &xn) {
        xn - U256::ONE
    } else {
        xn
    }
}

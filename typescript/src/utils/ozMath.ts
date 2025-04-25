/**
 * Computes the integer square root of a number using Newton's method
 * Ported from OpenZeppelin's Solidity library to TypeScript
 * @param a The input number (must be a non-negative integer)
 * @returns The integer square root of a
 */
export function sqrt(a: bigint): bigint {
    // Handle edge cases when a is 0 or 1
    if (a <= 1n) {
        return a;
    }

    // Find an initial approximation using bit manipulation
    // This approximation is close to 2^(log2(a)/2)
    let aa = a;
    let xn = 1n;

    if (aa >= 1n << 128n) {
        aa >>= 128n;
        xn <<= 64n;
    }
    if (aa >= 1n << 64n) {
        aa >>= 64n;
        xn <<= 32n;
    }
    if (aa >= 1n << 32n) {
        aa >>= 32n;
        xn <<= 16n;
    }
    if (aa >= 1n << 16n) {
        aa >>= 16n;
        xn <<= 8n;
    }
    if (aa >= 1n << 8n) {
        aa >>= 8n;
        xn <<= 4n;
    }
    if (aa >= 1n << 4n) {
        aa >>= 4n;
        xn <<= 2n;
    }
    if (aa >= 1n << 2n) {
        xn <<= 1n;
    }

    // Refine the initial approximation
    xn = (3n * xn) >> 1n;

    // Apply Newton's method iterations
    // Each iteration approximately doubles the number of correct bits
    xn = (xn + a / xn) >> 1n;
    xn = (xn + a / xn) >> 1n;
    xn = (xn + a / xn) >> 1n;
    xn = (xn + a / xn) >> 1n;
    xn = (xn + a / xn) >> 1n;
    xn = (xn + a / xn) >> 1n;

    // Final adjustment: if xn > sqrt(a), decrement by 1
    return xn - (xn > a / xn ? 1n : 0n);
}

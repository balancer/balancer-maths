from src.common.bigint import BigInt


def sqrt(a: int) -> int:
    """
    Computes the integer square root of a number using Newton's method
    Ported from OpenZeppelin's Solidity library to Python
    @param a The input number (must be a non-negative integer)
    @returns The integer square root of a
    """
    # Handle edge cases when a is 0 or 1
    if a <= 1:
        return a

    # Find an initial approximation using bit manipulation
    # This approximation is close to 2^(log2(a)/2)
    aa = a
    xn = 1

    if aa >= 1 << 128:
        aa >>= 128
        xn <<= 64
    if aa >= 1 << 64:
        aa >>= 64
        xn <<= 32
    if aa >= 1 << 32:
        aa >>= 32
        xn <<= 16
    if aa >= 1 << 16:
        aa >>= 16
        xn <<= 8
    if aa >= 1 << 8:
        aa >>= 8
        xn <<= 4
    if aa >= 1 << 4:
        aa >>= 4
        xn <<= 2
    if aa >= 1 << 2:
        xn <<= 1

    # Refine the initial approximation
    xn = (3 * xn) >> 1

    # Apply Newton's method iterations
    # Each iteration approximately doubles the number of correct bits
    xn = int((BigInt(xn) + BigInt(a) // BigInt(xn)) >> 1)
    xn = int((BigInt(xn) + BigInt(a) // BigInt(xn)) >> 1)
    xn = int((BigInt(xn) + BigInt(a) // BigInt(xn)) >> 1)
    xn = int((BigInt(xn) + BigInt(a) // BigInt(xn)) >> 1)
    xn = int((BigInt(xn) + BigInt(a) // BigInt(xn)) >> 1)

    # Final adjustment: if xn > sqrt(a), decrement by 1
    return xn - 1 if xn > int(BigInt(a) // BigInt(xn)) else xn

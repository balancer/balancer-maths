from enum import Enum

from src.common.bigint import BigInt
from src.common.constants import FOUR_WAD, MAX_POW_RELATIVE_ERROR, TWO_WAD, WAD
from src.common.log_exp_math import LogExpMath


class Rounding(Enum):
    ROUND_UP = 0
    ROUND_DOWN = 1


def mul_up_fixed(a: int, b: int) -> int:
    product = a * b
    if product == 0:
        return 0
    return int((BigInt(product - 1)) // BigInt(WAD) + 1)


def mul_down_fixed(a: int, b: int) -> int:
    product = a * b
    return int(BigInt(product) // BigInt(WAD))


def div_down_fixed(a: int, b: int) -> int:
    if a == 0:
        return 0

    a_inflated = a * WAD
    return int(BigInt(a_inflated) // BigInt(b))


def div_up_fixed(a: int, b: int) -> int:
    if a == 0:
        return 0

    a_inflated = a * WAD
    return int((BigInt(a_inflated - 1)) // BigInt(b) + 1)


def div_up(a: int, b: int) -> int:
    if b == 0:
        return 0

    return int(1 + (BigInt(a - 1)) // BigInt(b))


# @dev Return (a * b) / c, rounding up.
def mul_div_up_fixed(a: int, b: int, c: int) -> int:
    product = a * b
    # // The traditional divUp formula is:
    # // divUp(x, y) := (x + y - 1) / y
    # // To avoid intermediate overflow in the addition, we distribute the division and get:
    # // divUp(x, y) := (x - 1) / y + 1
    # // Note that this requires x != 0, if x == 0 then the result is zero
    # //
    # // Equivalent to:
    # // result = a == 0 ? 0 : (a * b - 1) / c + 1;
    if product == 0:
        return 0
    return int((BigInt(product - 1)) // BigInt(c) + 1)


def pow_down_fixed(x: int, y: int, version: int = 0) -> int:
    if y == WAD and version != 1:
        return x
    if y == TWO_WAD and version != 1:
        return mul_up_fixed(x, x)
    if y == FOUR_WAD and version != 1:
        square = mul_up_fixed(x, x)
        return mul_up_fixed(square, square)

    raw = LogExpMath.pow(x, y)
    max_error = mul_up_fixed(raw, MAX_POW_RELATIVE_ERROR) + 1

    if raw < max_error:
        return 0

    return raw - max_error


def pow_up_fixed(x: int, y: int, version: int = 0) -> int:
    if y == WAD and version != 1:
        return x
    if y == TWO_WAD and version != 1:
        return mul_up_fixed(x, x)
    if y == FOUR_WAD and version != 1:
        square = mul_up_fixed(x, x)
        return mul_up_fixed(square, square)

    raw = LogExpMath.pow(x, y)
    max_error = mul_up_fixed(raw, MAX_POW_RELATIVE_ERROR) + 1

    return raw + max_error


def complement_fixed(x: int) -> int:
    return WAD - x if x < WAD else 0

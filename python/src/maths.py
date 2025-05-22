from enum import Enum
from src.log_exp_math import LogExpMath


class Rounding(Enum):
    ROUND_UP = 0
    ROUND_DOWN = 1


MAX_POW_RELATIVE_ERROR = 10000
WAD = 1000000000000000000
TWO_WAD = 2000000000000000000
FOUR_WAD = 4000000000000000000
RAY = 1000000000000000000000000000000000000


def mul_up_fixed(a: int, b: int) -> int:
    product = a * b
    if product == 0:
        return 0
    return (product - 1) // WAD + 1


def mul_down_fixed(a: int, b: int) -> int:
    product = a * b
    return product // WAD


def div_down_fixed(a: int, b: int) -> int:
    if a == 0:
        return 0

    a_inflated = a * WAD
    return a_inflated // b


def div_up_fixed(a: int, b: int) -> int:
    if a == 0:
        return 0

    a_inflated = a * WAD
    return (a_inflated - 1) // b + 1


def div_up(a: int, b: int) -> int:
    if b == 0:
        return 0

    return 1 + (a - 1) // b


# @dev Return (a * b) / c, rounding up.
def mul_div_up(a: int, b: int, c: int) -> int:
    product = a * b
    # // The traditional divUp formula is:
    # // divUp(x, y) := (x + y - 1) / y
    # // To avoid intermediate overflow in the addition, we distribute the division and get:
    # // divUp(x, y) := (x - 1) / y + 1
    # // Note that this requires x != 0, if x == 0 then the result is zero
    # //
    # // Equivalent to:
    # // result = a == 0 ? 0 : (a * b - 1) / c + 1;
    return (product - 1) // c + 1


def pow_down_fixed(x: int, y: int, version: int = None) -> int:
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


def pow_up_fixed(x: int, y: int, version: int = None) -> int:
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

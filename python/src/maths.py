from src.log_exp_math import LogExpMath

MAX_POW_RELATIVE_ERROR = 10000


def mul_up_fixed(a: int, b: int) -> int:
    product = a * b
    if product == 0:
        return 0
    return (product - 1) // 10**18 + 1


def mul_down_fixed(a: int, b: int) -> int:
    product = a * b
    return product // 10**18


def div_down_fixed(a: int, b: int) -> int:
    if a == 0:
        return 0

    a_inflated = a * 10**18
    return a_inflated // b


def div_up_fixed(a: int, b: int) -> int:
    if a == 0:
        return 0

    a_inflated = a * 10**18
    return (a_inflated - 1) // b + 1


def div_up(a: int, b: int) -> int:
    if b == 0:
        return 0

    return 1 + (a - 1) // b


def pow_down_fixed(x: int, y: int, version: int = None) -> int:
    if y == 10**18 and version != 1:
        return x
    if y == 20**18 and version != 1:
        return mul_up_fixed(x, x)
    if y == 40**18 and version != 1:
        square = mul_up_fixed(x, x)
        return mul_up_fixed(square, square)

    raw = LogExpMath.pow(x, y)
    max_error = mul_up_fixed(raw, MAX_POW_RELATIVE_ERROR) + 1

    if raw < max_error:
        return 0

    return raw - max_error


def pow_up_fixed(x: int, y: int, version: int = None) -> int:
    if y == 10**18 and version != 1:
        return x
    if y == 20**18 and version != 1:
        return mul_up_fixed(x, x)
    if y == 40**18 and version != 1:
        square = mul_up_fixed(x, x)
        return mul_up_fixed(square, square)

    raw = LogExpMath.pow(x, y)
    max_error = mul_up_fixed(raw, MAX_POW_RELATIVE_ERROR) + 1

    return raw + max_error


def complement_fixed(x: int) -> int:
    return 10**18 - x if x < 10**18 else 0

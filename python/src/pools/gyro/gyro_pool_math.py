from src.common.constants import WAD
from src.common.maths import mul_down_fixed, mul_up_fixed

_SQRT_1E_NEG_1 = 316227766016837933
_SQRT_1E_NEG_3 = 31622776601683793
_SQRT_1E_NEG_5 = 3162277660168379
_SQRT_1E_NEG_7 = 316227766016837
_SQRT_1E_NEG_9 = 31622776601683
_SQRT_1E_NEG_11 = 3162277660168
_SQRT_1E_NEG_13 = 316227766016
_SQRT_1E_NEG_15 = 31622776601
_SQRT_1E_NEG_17 = 3162277660


def gyro_pool_math_sqrt(x: int, tolerance: int) -> int:
    if x == 0:
        return 0

    guess = _make_initial_guess(x)

    # Perform Newton's method iterations
    for _ in range(7):
        guess = (guess + (x * WAD) // guess) // 2

    guess_squared = mul_down_fixed(guess, guess)
    if not (
        guess_squared <= x + mul_up_fixed(guess, tolerance)
        and guess_squared >= x - mul_up_fixed(guess, tolerance)
    ):
        raise ValueError("_sqrt FAILED")

    return guess


def _make_initial_guess(x: int) -> int:
    if x >= WAD:
        return (1 << _int_log2_halved(x // WAD)) * WAD
    else:
        if x <= 10:
            return _SQRT_1E_NEG_17
        if x <= 100:
            return 10**10
        if x <= 1000:
            return _SQRT_1E_NEG_15
        if x <= 10000:
            return 10**11
        if x <= 100000:
            return _SQRT_1E_NEG_13
        if x <= 1000000:
            return 10**12
        if x <= 10000000:
            return _SQRT_1E_NEG_11
        if x <= 100000000:
            return 10**13
        if x <= 1000000000:
            return _SQRT_1E_NEG_9
        if x <= 10000000000:
            return 10**14
        if x <= 100000000000:
            return _SQRT_1E_NEG_7
        if x <= 1000000000000:
            return 10**15
        if x <= 10000000000000:
            return _SQRT_1E_NEG_5
        if x <= 100000000000000:
            return 10**16
        if x <= 1000000000000000:
            return _SQRT_1E_NEG_3
        if x <= 10000000000000000:
            return 10**17
        if x <= 100000000000000000:
            return _SQRT_1E_NEG_1
        return x


def _int_log2_halved(x: int) -> int:
    n = 0

    if x >= 1 << 128:
        x >>= 128
        n += 64
    if x >= 1 << 64:
        x >>= 64
        n += 32
    if x >= 1 << 32:
        x >>= 32
        n += 16
    if x >= 1 << 16:
        x >>= 16
        n += 8
    if x >= 1 << 8:
        x >>= 8
        n += 4
    if x >= 1 << 4:
        x >>= 4
        n += 2
    if x >= 1 << 2:
        x >>= 2
        n += 1

    return n

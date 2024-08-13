from src.swap import SwapKind
from src.pools.buffer.enums import Rounding
from src.pools.buffer.enums import WrappingDirection
from src.pools.buffer.ray_math_explicit_rounding import RayMathExplicitRounding


def calculate_buffer_amounts(
    direction,
    kind,
    amount_raw,
    rate,
):
    if direction == WrappingDirection.WRAP:
        # Amount in is underlying tokens, amount out is wrapped tokens
        if kind == SwapKind.GIVENIN:
            # previewDeposit
            return _convertToShares(amount_raw, rate, Rounding.DOWN)
        # previewMint
        return _convertToAssets(amount_raw, rate, Rounding.UP)

    # Amount in is wrapped tokens, amount out is underlying tokens
    if kind == SwapKind.GIVENIN:
        # previewRedeem
        return _convertToAssets(amount_raw, rate, Rounding.DOWN)
    # previewWithdraw
    return _convertToShares(amount_raw, rate, Rounding.UP)


def _convertToShares(assets, rate, rounding):
    if rounding == Rounding.UP:
        return RayMathExplicitRounding.ray_div_round_up(assets, rate)
    return RayMathExplicitRounding.ray_mul_round_down(assets, rate)


def _convertToAssets(shares, rate, rounding):
    if rounding == Rounding.UP:
        return RayMathExplicitRounding.ray_mul_round_up(shares, rate)
    return RayMathExplicitRounding.ray_mul_round_down(shares, rate)

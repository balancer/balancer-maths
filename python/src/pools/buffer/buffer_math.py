from src.swap import SwapKind
from src.pools.buffer.enums import Rounding
from src.pools.buffer.enums import WrappingDirection
from src.maths import div_down_fixed, div_up_fixed, mul_down_fixed, mul_up_fixed


# See VaultExtension for SC code.
# Instead of manually adding support for each ERC4626 implementation (e.g. stata with Ray maths)
# we always use an 18 decimal scaled rate and do 18 decimal maths to convert. 
# We may end up loosing 100% accuracy but thats acceptable.
def calculate_buffer_amounts(
    direction,
    kind,
    amount_raw,
    rate,
):
    if direction == WrappingDirection.WRAP:
        # Amount in is underlying tokens, amount out is wrapped tokens
        if kind == SwapKind.GIVENIN.value:
            # previewDeposit
            return _convert_to_shares(amount_raw, rate, Rounding.DOWN)
        # previewMint
        return _convert_to_assets(amount_raw, rate, Rounding.UP)

    # Amount in is wrapped tokens, amount out is underlying tokens
    if kind == SwapKind.GIVENIN.value:
        # previewRedeem
        return _convert_to_assets(amount_raw, rate, Rounding.DOWN)
    # previewWithdraw
    return _convert_to_shares(amount_raw, rate, Rounding.UP)


def _convert_to_shares(assets, rate, rounding):
    if rounding == Rounding.UP:
        return div_up_fixed(assets, rate)
    return div_down_fixed(assets, rate)


def _convert_to_assets(shares, rate, rounding):
    if rounding == Rounding.UP:
        return mul_up_fixed(shares, rate)
    return mul_down_fixed(shares, rate)

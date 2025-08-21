from src.common.types import SwapInput
from src.common.utils import is_same_address
from src.pools.buffer.buffer_data import BufferState
from src.pools.buffer.buffer_math import calculate_buffer_amounts
from src.pools.buffer.enums import WrappingDirection

_MINIMUM_WRAP_AMOUNT = 1000


def erc4626_buffer_wrap_or_unwrap(swap_input: SwapInput, pool_state: BufferState):
    if swap_input.amount_raw < _MINIMUM_WRAP_AMOUNT:
        # If amount given is too small, rounding issues can be introduced that favors the user and can drain
        # the buffer. _MINIMUM_WRAP_AMOUNT prevents it. Most tokens have protections against it already, this
        # is just an extra layer of security.
        raise ValueError("wrapAmountTooSmall")

    wrapping_direction = (
        WrappingDirection.UNWRAP
        if is_same_address(swap_input.token_in, pool_state.pool_address) is True
        else WrappingDirection.WRAP
    )

    return calculate_buffer_amounts(
        wrapping_direction,
        swap_input.swap_kind,
        swap_input.amount_raw,
        pool_state.rate,
    )

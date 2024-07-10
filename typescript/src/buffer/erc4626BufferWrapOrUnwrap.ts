import { BufferState } from '../buffer/data';
import { isSameAddress } from '../vault/utils';
import { SwapInput } from '../vault/vault';
import { calculateBufferAmounts } from './bufferMath';

export enum WrappingDirection {
    WRAP = 0,
    UNWRAP = 1,
}

const _MINIMUM_WRAP_AMOUNT = 1000000n;

export function erc4626BufferWrapOrUnwrap(
    input: SwapInput,
    poolState: BufferState,
): bigint {
    if (input.amountRaw < _MINIMUM_WRAP_AMOUNT) {
        // If amount given is too small, rounding issues can be introduced that favors the user and can drain
        // the buffer. _MINIMUM_WRAP_AMOUNT prevents it. Most tokens have protections against it already, this
        // is just an extra layer of security.
        throw new Error('wrapAmountTooSmall');
    }
    const wrappingDirection = isSameAddress(
        input.tokenIn,
        poolState.poolAddress,
    )
        ? WrappingDirection.UNWRAP
        : WrappingDirection.WRAP;

    return calculateBufferAmounts(
        wrappingDirection,
        input.swapKind,
        input.amountRaw,
        poolState.rate,
    );
}

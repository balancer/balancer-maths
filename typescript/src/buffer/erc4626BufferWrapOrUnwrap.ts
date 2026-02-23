import { BufferState } from '../buffer/data';
import { isSameAddress } from '../vault/utils';
import { SwapInput, SwapKind } from '../vault/types';
import { calculateBufferAmounts } from './bufferMath';
import { WrappingDirection } from './types';

const _MINIMUM_WRAP_AMOUNT = 1000n;

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

    const { scalingFactor } = poolState;

    // Scale underlying amounts up before 18-decimal math
    let amountForCalc = input.amountRaw;
    if (
        (wrappingDirection === WrappingDirection.WRAP &&
            input.swapKind === SwapKind.GivenIn) ||
        (wrappingDirection === WrappingDirection.UNWRAP &&
            input.swapKind === SwapKind.GivenOut)
    ) {
        amountForCalc = input.amountRaw * scalingFactor;
    }

    const result = calculateBufferAmounts(
        wrappingDirection,
        input.swapKind,
        amountForCalc,
        poolState.rate,
        poolState.maxDeposit,
        poolState.maxMint,
    );

    // Scale results back down to underlying decimals
    if (
        (wrappingDirection === WrappingDirection.WRAP &&
            input.swapKind === SwapKind.GivenOut) ||
        (wrappingDirection === WrappingDirection.UNWRAP &&
            input.swapKind === SwapKind.GivenIn)
    ) {
        return result / scalingFactor;
    }

    return result;
}

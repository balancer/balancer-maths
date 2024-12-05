import { MathSol } from '../utils/math';

export function isSameAddress(addressOne: string, addressTwo: string) {
    return addressOne.toLowerCase() === addressTwo.toLowerCase();
}

/**
 * @dev Reverses the `scalingFactor` and `tokenRate` applied to `amount`, resulting in a smaller or equal value
 * depending on whether it needed scaling/rate adjustment or not. The result is rounded down.
 */
export function toRawUndoRateRoundDown(
    amount: bigint,
    scalingFactor: bigint,
    tokenRate: bigint,
): bigint {
    // Do division last. Scaling factor is not a FP18, but a FP18 normalized by FP(1).
    // `scalingFactor * tokenRate` is a precise FP18, so there is no rounding direction here.
    return MathSol.divDownFixed(amount, scalingFactor * tokenRate);
}

/**
 * @dev Reverses the `scalingFactor` and `tokenRate` applied to `amount`, resulting in a smaller or equal value
 * depending on whether it needed scaling/rate adjustment or not. The result is rounded up.
 */
export function toRawUndoRateRoundUp(
    amount: bigint,
    scalingFactor: bigint,
    tokenRate: bigint,
): bigint {
    // Do division last. Scaling factor is not a FP18, but a FP18 normalized by FP(1).
    // `scalingFactor * tokenRate` is a precise FP18, so there is no rounding direction here.
    return MathSol.divUpFixed(amount, scalingFactor * tokenRate);
}

/**
 * @dev Applies `scalingFactor` and `tokenRate` to `amount`, resulting in a larger or equal value depending on
 * whether it needed scaling/rate adjustment or not. The result is rounded down.
 */
export function toScaled18ApplyRateRoundDown(
    amount: bigint,
    scalingFactor: bigint,
    tokenRate: bigint,
): bigint {
    return MathSol.mulDownFixed(amount * scalingFactor, tokenRate);
}

/**
 * @dev Applies `scalingFactor` and `tokenRate` to `amount`, resulting in a larger or equal value depending on
 * whether it needed scaling/rate adjustment or not. The result is rounded up.
 */
export function toScaled18ApplyRateRoundUp(
    amount: bigint,
    scalingFactor: bigint,
    tokenRate: bigint,
): bigint {
    return MathSol.mulUpFixed(amount * scalingFactor, tokenRate);
}

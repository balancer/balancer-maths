import { MathSol } from '../utils/math';

/**
 * @notice Calculate the current block weight based on time interpolation
 * @param weight The base weight
 * @param multiplier The weight multiplier
 * @param timeSinceLastUpdate The time since the last weight update
 * @return The interpolated weight
 */
export const calculateBlockNormalisedWeight = (
    weight: bigint,
    multiplier: bigint,
    timeSinceLastUpdate: bigint,
): bigint => {
    // multiplier is always below 1, we multiply by 1e18 for rounding
    const multiplierScaled18 = multiplier * BigInt(1e18);

    if (multiplier > 0n) {
        return (
            weight +
            MathSol.mulDownFixed(multiplierScaled18, timeSinceLastUpdate)
        );
    } else {
        return (
            weight -
            MathSol.mulDownFixed(-multiplierScaled18, timeSinceLastUpdate)
        );
    }
};

/**
 * Both functions below are simplified versions of the SC implementation.
 * They extract weights and multipliers from mutable data fecthed on-chain, which
 * are packed and stored in 256-bit words for storage efficiency, but here can
 * be unpacked into separate weights and multipliers arrays.
 */

export const getFirstFourWeightsAndMultipliers = (
    tokens: string[],
    firstFourWeightsAndMultipliers: bigint[],
): { weights: bigint[]; multipliers: bigint[] } => {
    const weights = new Array(tokens.length).fill(0n);
    const multipliers = new Array(tokens.length).fill(0n);

    const lessThan4TokensOffset = tokens.length > 4 ? 4 : tokens.length;

    for (let i = 0; i < tokens.length; i++) {
        weights[i] = firstFourWeightsAndMultipliers[i];
        multipliers[i] =
            firstFourWeightsAndMultipliers[i + lessThan4TokensOffset];
    }

    return { weights, multipliers };
};

export const getSecondFourWeightsAndMultipliers = (
    tokens: string[],
    secondFourWeightsAndMultipliers: bigint[],
): { weights: bigint[]; multipliers: bigint[] } => {
    const weights = new Array(tokens.length).fill(0n);
    const multipliers = new Array(tokens.length).fill(0n);

    const moreThan4TokensOffset = tokens.length - 4;

    for (let i = 0; i < tokens.length; i++) {
        weights[i] = secondFourWeightsAndMultipliers[i];
        multipliers[i] =
            secondFourWeightsAndMultipliers[i + moreThan4TokensOffset];
    }

    return { weights, multipliers };
};

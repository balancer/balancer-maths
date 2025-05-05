import { MathSol, WAD } from './math';

/**
 * Calculates the normalized weights for a liquidity pool.
 * @param projectTokenIndex Index of the project token.
 * @param currentTime Current timestamp in seconds.
 * @param startTime Start time of the weight change.
 * @param endTime End time of the weight change.
 * @param projectTokenStartWeight Initial weight of the project token.
 * @param projectTokenEndWeight Final weight of the project token.
 * @returns An array of normalized weights for the tokens.
 */
export function getNormalizedWeights(
    projectTokenIndex: number,
    currentTime: bigint,
    startTime: bigint,
    endTime: bigint,
    projectTokenStartWeight: bigint,
    projectTokenEndWeight: bigint,
): bigint[] {
    const normalizedWeights: bigint[] = [0n, 0n];

    // Infer the reserve token index
    const reserveTokenIndex = projectTokenIndex === 0 ? 1 : 0;

    // Calculate the normalized weight for the project token
    normalizedWeights[projectTokenIndex] = getProjectTokenNormalizedWeight(
        currentTime,
        startTime,
        endTime,
        projectTokenStartWeight,
        projectTokenEndWeight,
    );

    // Calculate the normalized weight for the reserve token
    normalizedWeights[reserveTokenIndex] =
        WAD - normalizedWeights[projectTokenIndex];

    return normalizedWeights;
}

// Private helper functions (not exported)

/**
 * Calculates the normalized weight of the project token.
 */
function getProjectTokenNormalizedWeight(
    currentTime: bigint,
    startTime: bigint,
    endTime: bigint,
    startWeight: bigint,
    endWeight: bigint,
): bigint {
    const pctProgress = calculateValueChangeProgress(
        currentTime,
        startTime,
        endTime,
    );

    return interpolateValue(startWeight, endWeight, pctProgress);
}

/**
 * Calculates the progress of a value change as a fixed-point number.
 */
function calculateValueChangeProgress(
    currentTime: bigint,
    startTime: bigint,
    endTime: bigint,
): bigint {
    if (currentTime >= endTime) {
        return WAD; // Fully completed
    } else if (currentTime <= startTime) {
        return 0n; // Not started
    }

    const totalSeconds = endTime - startTime;
    const secondsElapsed = currentTime - startTime;

    // Ensure MathSol.divDownFixed returns a BigInt
    const progress = MathSol.divDownFixed(secondsElapsed, totalSeconds);
    return progress;
}

/**
 * Interpolates a value based on the progress of a change.
 */
function interpolateValue(
    startValue: bigint,
    endValue: bigint,
    pctProgress: bigint,
): bigint {
    if (pctProgress >= WAD || startValue === endValue) {
        return endValue;
    }

    if (pctProgress === 0n) {
        return startValue;
    }

    if (startValue > endValue) {
        const delta = MathSol.mulDownFixed(pctProgress, startValue - endValue);
        return startValue - delta;
    } else {
        const delta = MathSol.mulDownFixed(pctProgress, endValue - startValue);
        return startValue + delta;
    }
}

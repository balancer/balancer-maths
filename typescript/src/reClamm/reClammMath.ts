import {
    FixedPointFunction,
    LogExpMath,
    MathSol,
    RAY,
    TWO_WAD,
    WAD,
} from '../utils/math';
import { sqrt } from '../utils/ozMath';
import { Rounding } from '../vault/types';

type PriceRatioState = {
    priceRatioUpdateStartTime: bigint;
    priceRatioUpdateEndTime: bigint;
    startFourthRootPriceRatio: bigint;
    endFourthRootPriceRatio: bigint;
};

export function computeCurrentVirtualBalances(
    currentTimestamp: bigint,
    balancesScaled18: bigint[],
    lastVirtualBalanceA: bigint,
    lastVirtualBalanceB: bigint,
    priceShiftDailyRateInSeconds: bigint,
    lastTimestamp: bigint,
    centerednessMargin: bigint,
    priceRatioState: PriceRatioState,
): {
    currentVirtualBalanceA: bigint;
    currentVirtualBalanceB: bigint;
    changed: boolean;
} {
    if (lastTimestamp == currentTimestamp) {
        return {
            currentVirtualBalanceA: lastVirtualBalanceA,
            currentVirtualBalanceB: lastVirtualBalanceB,
            changed: false,
        };
    }

    let currentVirtualBalanceA = lastVirtualBalanceA;
    let currentVirtualBalanceB = lastVirtualBalanceB;

    const currentFourthRootPriceRatio = computeFourthRootPriceRatio(
        currentTimestamp,
        priceRatioState.startFourthRootPriceRatio,
        priceRatioState.endFourthRootPriceRatio,
        priceRatioState.priceRatioUpdateStartTime,
        priceRatioState.priceRatioUpdateEndTime,
    );

    const isPoolAboveCenter = isAboveCenter(
        balancesScaled18,
        lastVirtualBalanceA,
        lastVirtualBalanceB,
    );

    let changed = false;

    if (
        currentTimestamp > priceRatioState.priceRatioUpdateStartTime &&
        lastTimestamp < priceRatioState.priceRatioUpdateEndTime
    ) {
        [currentVirtualBalanceA, currentVirtualBalanceB] = calculateVirtualBalancesUpdatingPriceRatio(
            currentFourthRootPriceRatio,
            balancesScaled18,
            lastVirtualBalanceA,
            lastVirtualBalanceB,
            isPoolAboveCenter,
        );
        changed = true;
    }

    if (
        !isPoolWithinTargetRange(
            balancesScaled18,
            currentVirtualBalanceA,
            currentVirtualBalanceB,
            centerednessMargin,
        )
    ) {
        [currentVirtualBalanceA, currentVirtualBalanceB] =
            computeVirtualBalancesUpdatingPriceRange(
                currentFourthRootPriceRatio,
                balancesScaled18,
                currentVirtualBalanceA,
                currentVirtualBalanceB,
                isPoolAboveCenter,
                priceShiftDailyRateInSeconds,
                currentTimestamp,
                lastTimestamp,
            );

        changed = true;
    }

    return {
        currentVirtualBalanceA,
        currentVirtualBalanceB,
        changed,
    };
}

function computeVirtualBalancesUpdatingPriceRange(
    currentFourthRootPriceRatio: bigint,
    balancesScaled18: bigint[],
    virtualBalanceA: bigint,
    virtualBalanceB: bigint,
    isPoolAboveCenter: boolean,
    priceShiftDailyRateInSeconds: bigint,
    currentTimestamp: bigint,
    lastTimestamp: bigint,
): [bigint, bigint] {
    // // Round up price ratio, to round virtual balances down.
    const priceRatio = MathSol.mulUpFixed(
        currentFourthRootPriceRatio,
        currentFourthRootPriceRatio,
    );

    // // The overvalued token is the one with a lower token balance (therefore, rarer and more valuable).
    const [balancesScaledUndervalued, balancesScaledOvervalued] =
        isPoolAboveCenter
            ? [balancesScaled18[0], balancesScaled18[1]]
            : [balancesScaled18[1], balancesScaled18[0]];
    let [virtualBalanceUndervalued, virtualBalanceOvervalued] =
        isPoolAboveCenter
            ? [virtualBalanceA, virtualBalanceB]
            : [virtualBalanceB, virtualBalanceA];

    // // Vb = Vb * (1 - priceShiftDailyRateInSeconds)^(T_curr - T_last)
    virtualBalanceOvervalued = MathSol.mulDownFixed(
        virtualBalanceOvervalued,
        LogExpMath.pow(
            WAD - priceShiftDailyRateInSeconds,
            (currentTimestamp - lastTimestamp) * WAD,
        ),
    );
    // // Va = (Ra * (Vb + Rb)) / (((priceRatio - 1) * Vb) - Rb)
    virtualBalanceUndervalued =
        (balancesScaledUndervalued *
            (virtualBalanceOvervalued + balancesScaledOvervalued)) /
        (MathSol.mulDownFixed(priceRatio - WAD, virtualBalanceOvervalued) -
            balancesScaledOvervalued);

    return isPoolAboveCenter
        ? [virtualBalanceUndervalued, virtualBalanceOvervalued]
        : [virtualBalanceOvervalued, virtualBalanceUndervalued];
}

function isPoolWithinTargetRange(
    balancesScaled18: bigint[],
    virtualBalanceA: bigint,
    virtualBalanceB: bigint,
    centerednessMargin: bigint,
): boolean {
    const centeredness = computeCenteredness(
        balancesScaled18,
        virtualBalanceA,
        virtualBalanceB,
    );
    return centeredness >= centerednessMargin;
}

function computeFourthRootPriceRatio(
    currentTime: bigint,
    startFourthRootPriceRatio: bigint,
    endFourthRootPriceRatio: bigint,
    priceRatioUpdateStartTime: bigint,
    priceRatioUpdateEndTime: bigint,
): bigint {
    // if start and end time are the same, return end value.
    if (currentTime >= priceRatioUpdateEndTime) {
        return endFourthRootPriceRatio;
    } else if (currentTime <= priceRatioUpdateStartTime) {
        return startFourthRootPriceRatio;
    }

    const exponent = MathSol.divDownFixed(
        currentTime - priceRatioUpdateStartTime,
        priceRatioUpdateEndTime - priceRatioUpdateStartTime,
    );

    return (
        (startFourthRootPriceRatio *
            LogExpMath.pow(endFourthRootPriceRatio, exponent)) /
        LogExpMath.pow(startFourthRootPriceRatio, exponent)
    );
}

function isAboveCenter(
    balancesScaled18: bigint[],
    virtualBalancesA: bigint,
    virtualBalancesB: bigint,
): boolean {
    if (balancesScaled18[1] === 0n) {
        return true;
    } else {
        return (
            MathSol.divDownFixed(balancesScaled18[0], balancesScaled18[1]) >
            MathSol.divDownFixed(virtualBalancesA, virtualBalancesB)
        );
    }
}

function calculateVirtualBalancesUpdatingPriceRatio(
    currentFourthRootPriceRatio: bigint,
    balancesScaled18: bigint[],
    lastVirtualBalanceA: bigint,
    lastVirtualBalanceB: bigint,
    isPoolAboveCenter: boolean,
): [bigint, bigint] {
    // The overvalued token is the one with a lower token balance (therefore, rarer and more valuable).
    const [indexTokenUndervalued, indexTokenOvervalued] = isPoolAboveCenter
        ? [0, 1]
        : [1, 0];
    const balanceTokenUndervalued = balancesScaled18[indexTokenUndervalued];
    const balanceTokenOvervalued = balancesScaled18[indexTokenOvervalued];

    // Compute the current pool centeredness, which will remain constant.
    const poolCenteredness = computeCenteredness(
        balancesScaled18,
        lastVirtualBalanceA,
        lastVirtualBalanceB,
    );

    // The original formula was a quadratic equation, with terms:
    // a = Q0 - 1
    // b = - Ru (1 + C)
    // c = - Ru^2 C
    // where Q0 is the square root of the price ratio, Ru is the undervalued token balance, and C is the
    // centeredness. Applying Bhaskara, we'd have: Vu = (-b + sqrt(b^2 - 4ac)) / 2a.
    // The Bhaskara above can be simplified by replacing a, b and c with the terms above, which leads to:
    // Vu = Ru(1 + C + sqrt(1 + C (C + 4 Q0 - 2))) / 2(Q0 - 1)
    const sqrtPriceRatio = MathSol.mulUpFixed(
        currentFourthRootPriceRatio,
        currentFourthRootPriceRatio,
    );

    // Using FixedPoint math as little as possible to improve the precision of the result.
    // Note: The input of Math.sqrt must be a 36-decimal number, so that the final result is 18 decimals.
    const virtualBalanceUndervalued =
        (balanceTokenOvervalued *
            (WAD +
                poolCenteredness +
                sqrt(
                    poolCenteredness *
                        (poolCenteredness + 4n * sqrtPriceRatio - TWO_WAD) +
                        RAY,
                ))) /
        (2n * (sqrtPriceRatio - WAD));

    const virtualBalanceOvervalued = MathSol.divDownFixed(
        (balanceTokenOvervalued * virtualBalanceUndervalued) /
            balanceTokenUndervalued,
        poolCenteredness,
    );

    return isPoolAboveCenter
        ? [virtualBalanceUndervalued, virtualBalanceOvervalued]
        : [virtualBalanceOvervalued, virtualBalanceUndervalued];
}

export function computeCenteredness(
    balancesScaled18: bigint[],
    virtualBalanceA: bigint,
    virtualBalanceB: bigint,
): bigint {
    if (balancesScaled18[0] == 0n || balancesScaled18[1] == 0n) {
        return 0n;
    }

    const isPoolAboveCenter = isAboveCenter(
        balancesScaled18,
        virtualBalanceA,
        virtualBalanceB,
    );

    // The overvalued token is the one with a lower token balance (therefore, rarer and more valuable).
    const [virtualBalanceUndervalued, virtualBalanceOvervalued] =
        isPoolAboveCenter
            ? [virtualBalanceA, virtualBalanceB]
            : [virtualBalanceB, virtualBalanceA];

    const [balancesScaledUndervalued, balancesScaledOvervalued] =
        isPoolAboveCenter
            ? [balancesScaled18[0], balancesScaled18[1]]
            : [balancesScaled18[1], balancesScaled18[0]];

    // Round up the centeredness, so the virtual balances are rounded down when the pool prices are moving.
    return MathSol.divUpFixed(
        (balancesScaledOvervalued * virtualBalanceUndervalued) /
            balancesScaledUndervalued,
        virtualBalanceOvervalued,
    );
}

function computeInvariant(
    balancesScaled18: bigint[],
    virtualBalanceA: bigint,
    virtualBalanceB: bigint,
    rounding: Rounding,
): bigint {
    const _mulUpOrDown: FixedPointFunction =
        rounding === Rounding.ROUND_DOWN
            ? MathSol.mulDownFixed
            : MathSol.mulUpFixed;

    return _mulUpOrDown(
        balancesScaled18[0] + virtualBalanceA,
        balancesScaled18[1] + virtualBalanceB,
    );
}

export function computeOutGivenIn(
    balancesScaled18: bigint[],
    virtualBalanceA: bigint,
    virtualBalanceB: bigint,
    tokenInIndex: number,
    tokenOutIndex: number,
    amountGivenScaled18: bigint,
): bigint {
    const [virtualBalanceTokenIn, virtualBalanceTokenOut] =
        tokenInIndex === 0
            ? [virtualBalanceA, virtualBalanceB]
            : [virtualBalanceB, virtualBalanceA];

    // Round up, so the swapper absorbs rounding imprecisions (rounds in favor of the Vault).
    const invariant = computeInvariant(
        balancesScaled18,
        virtualBalanceA,
        virtualBalanceB,
        Rounding.ROUND_UP,
    );
    // Total (virtual + real) token out amount that should stay in the pool after the swap. Rounding division up,
    // which will round the token out amount down, favoring the Vault.
    const newTotalTokenOutPoolBalance = MathSol.divUpFixed(
        invariant,
        balancesScaled18[tokenInIndex] +
            virtualBalanceTokenIn +
            amountGivenScaled18,
    );

    const currentTotalTokenOutPoolBalance =
        balancesScaled18[tokenOutIndex] + virtualBalanceTokenOut;

    if (newTotalTokenOutPoolBalance > currentTotalTokenOutPoolBalance) {
        // If the amount of `tokenOut` remaining in the pool post-swap is greater than the total balance of
        // `tokenOut`, that means the swap result is negative due to a rounding issue.
        throw new Error(`reClammMath: NegativeAmountOut`);
    }

    const amountOutScaled18 =
        currentTotalTokenOutPoolBalance - newTotalTokenOutPoolBalance;
    if (amountOutScaled18 > balancesScaled18[tokenOutIndex]) {
        // Amount out cannot be greater than the real balance of the token.
        throw new Error(`reClammMath: AmountOutGreaterThanBalance`);
    }
    return amountOutScaled18;
}

export function computeInGivenOut(
    balancesScaled18: bigint[],
    virtualBalanceA: bigint,
    virtualBalanceB: bigint,
    tokenInIndex: number,
    tokenOutIndex: number,
    amountOutScaled18: bigint,
): bigint {
    if (amountOutScaled18 > balancesScaled18[tokenOutIndex]) {
        // Amount out cannot be greater than the real balance of the token in the pool.
        throw new Error(`reClammMath: AmountOutGreaterThanBalance`);
    }

    // Round up, so the swapper absorbs any imprecision due to rounding (i.e., it rounds in favor of the Vault).
    const invariant = computeInvariant(
        balancesScaled18,
        virtualBalanceA,
        virtualBalanceB,
        Rounding.ROUND_UP,
    );

    const [virtualBalanceTokenIn, virtualBalanceTokenOut] =
        tokenInIndex === 0
            ? [virtualBalanceA, virtualBalanceB]
            : [virtualBalanceB, virtualBalanceA];

    // Rounding division up, which will round the `tokenIn` amount up, favoring the Vault.
    const amountInScaled18 =
        MathSol.divUpFixed(
            invariant,
            balancesScaled18[tokenOutIndex] +
                virtualBalanceTokenOut -
                amountOutScaled18,
        ) -
        balancesScaled18[tokenInIndex] -
        virtualBalanceTokenIn;

    return amountInScaled18;
}

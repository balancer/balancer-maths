import { FixedPointFunction, MathSol, WAD } from '../utils/math';
import { sqrt } from '../utils/ozMath';
import { Rounding } from '../vault/types';

type PriceRatioState = {
    priceRatioUpdateStartTime: bigint;
    priceRatioUpdateEndTime: bigint;
    startFourthRootPriceRatio: bigint;
    endFourthRootPriceRatio: bigint;
};

const a = 0;
const b = 1;

const thirtyDaysSeconds = 30n * 24n * 60n * 60n; // 2,592,000n seconds

export function computeCurrentVirtualBalances(
    currentTimestamp: bigint,
    balancesScaled18: bigint[],
    lastVirtualBalanceA: bigint,
    lastVirtualBalanceB: bigint,
    dailyPriceShiftBase: bigint,
    lastTimestamp: bigint,
    centerednessMargin: bigint,
    priceRatioState: PriceRatioState,
): {
    currentVirtualBalanceA: bigint;
    currentVirtualBalanceB: bigint;
    changed: boolean;
} {
    if (lastTimestamp === currentTimestamp) {
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

    let changed = false;

    // If the price ratio is updating, shrink/expand the price interval by recalculating the virtual balances.
    if (
        currentTimestamp > priceRatioState.priceRatioUpdateStartTime &&
        lastTimestamp < priceRatioState.priceRatioUpdateEndTime
    ) {
        ({
            virtualBalanceA: currentVirtualBalanceA,
            virtualBalanceB: currentVirtualBalanceB,
        } = computeVirtualBalancesUpdatingPriceRatio(
            currentFourthRootPriceRatio,
            balancesScaled18,
            lastVirtualBalanceA,
            lastVirtualBalanceB,
        ));

        changed = true;
    }

    const { poolCenteredness: centeredness, isPoolAboveCenter } =
        computeCenteredness(
            balancesScaled18,
            currentVirtualBalanceA,
            currentVirtualBalanceB,
        );

    // If the pool is outside the target range, track the market price by moving the price interval.
    if (centeredness < centerednessMargin) {
        [currentVirtualBalanceA, currentVirtualBalanceB] =
            computeVirtualBalancesUpdatingPriceRange(
                balancesScaled18,
                currentVirtualBalanceA,
                currentVirtualBalanceB,
                isPoolAboveCenter,
                dailyPriceShiftBase,
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

/**
 * @notice Compute the virtual balances of the pool when the price ratio is updating.
 * @dev This function uses a Bhaskara formula to shrink/expand the price interval by recalculating the virtual
 * balances. It'll keep the pool centeredness constant, and track the desired price ratio. To derive this formula,
 * we need to solve the following simultaneous equations:
 *
 * 1. centeredness = (Ra * Vb) / (Rb * Va)
 * 2. PriceRatio = invariant^2/(Va * Vb)^2 (maxPrice / minPrice)
 * 3. invariant = (Va + Ra) * (Vb + Rb)
 *
 * Substitute [3] in [2]. Then, isolate one of the V's. Finally, replace the isolated V in [1]. We get a quadratic
 * equation that will be solved in this function.
 *
 * @param currentFourthRootPriceRatio The current fourth root of the price ratio of the pool
 * @param balancesScaled18 Current pool balances, sorted in token registration order
 * @param lastVirtualBalanceA The last virtual balance of token A
 * @param lastVirtualBalanceB The last virtual balance of token B
 * @return virtualBalanceA The virtual balance of token A
 * @return virtualBalanceB The virtual balance of token B
 */
function computeVirtualBalancesUpdatingPriceRatio(
    currentFourthRootPriceRatio: bigint,
    balancesScaled18: bigint[],
    lastVirtualBalanceA: bigint,
    lastVirtualBalanceB: bigint,
): { virtualBalanceA: bigint; virtualBalanceB: bigint } {
    // Compute the current pool centeredness, which will remain constant.
    const { poolCenteredness, isPoolAboveCenter } = computeCenteredness(
        balancesScaled18,
        lastVirtualBalanceA,
        lastVirtualBalanceB,
    );

    // The overvalued token is the one with a lower token balance (therefore, rarer and more valuable).
    const {
        balanceTokenUndervalued,
        lastVirtualBalanceUndervalued,
        lastVirtualBalanceOvervalued,
    } = isPoolAboveCenter
        ? {
              balanceTokenUndervalued: balancesScaled18[a],
              lastVirtualBalanceUndervalued: lastVirtualBalanceA,
              lastVirtualBalanceOvervalued: lastVirtualBalanceB,
          }
        : {
              balanceTokenUndervalued: balancesScaled18[b],
              lastVirtualBalanceUndervalued: lastVirtualBalanceB,
              lastVirtualBalanceOvervalued: lastVirtualBalanceA,
          };

    // The original formula was a quadratic equation, with terms:
    // a = Q0 - 1
    // b = - Ru (1 + C)
    // c = - Ru^2 C
    // where Q0 is the square root of the price ratio, Ru is the undervalued token balance, and C is the
    // centeredness. Applying Bhaskara, we'd have: Vu = (-b + sqrt(b^2 - 4ac)) / 2a.
    // The Bhaskara above can be simplified by replacing a, b and c with the terms above, which leads to:
    // Vu = Ru(1 + C + sqrt(1 + C (C + 4 Q0 - 2))) / 2(Q0 - 1)
    const sqrtPriceRatio = MathSol.mulDownFixed(
        currentFourthRootPriceRatio,
        currentFourthRootPriceRatio,
    );

    // Using FixedPoint math as little as possible to improve the precision of the result.
    // Note: The input of Math.sqrt must be a 36-decimal number, so that the final result is 18 decimals.
    const virtualBalanceUndervalued =
        (balanceTokenUndervalued *
            (WAD +
                poolCenteredness +
                sqrt(
                    poolCenteredness *
                        (poolCenteredness +
                            4n * sqrtPriceRatio -
                            2000000000000000000n) +
                        1000000000000000000000000000000000000n,
                ))) /
        (2n * (sqrtPriceRatio - WAD));

    const virtualBalanceOvervalued =
        (virtualBalanceUndervalued * lastVirtualBalanceOvervalued) /
        lastVirtualBalanceUndervalued;

    const { virtualBalanceA, virtualBalanceB } = isPoolAboveCenter
        ? {
              virtualBalanceA: virtualBalanceUndervalued,
              virtualBalanceB: virtualBalanceOvervalued,
          }
        : {
              virtualBalanceA: virtualBalanceOvervalued,
              virtualBalanceB: virtualBalanceUndervalued,
          };

    return { virtualBalanceA, virtualBalanceB };
}

function computeVirtualBalancesUpdatingPriceRange(
    balancesScaled18: bigint[],
    virtualBalanceA: bigint,
    virtualBalanceB: bigint,
    isPoolAboveCenter: boolean,
    dailyPriceShiftBase: bigint,
    currentTimestamp: bigint,
    lastTimestamp: bigint,
): [bigint, bigint] {
    const sqrtPriceRatio = sqrtScaled18(
        computePriceRatio(balancesScaled18, virtualBalanceA, virtualBalanceB),
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

    // +-----------------------------------------+
    // |                      (Tc - Tl)          |
    // |      Vo = Vo * (Psb)^                   |
    // +-----------------------------------------+
    // |  Where:                                 |
    // |    Vo = Virtual balance overvalued      |
    // |    Psb = Price shift daily rate base    |
    // |    Tc = Current timestamp               |
    // |    Tl = Last timestamp                  |
    // +-----------------------------------------+
    // |               Ru * (Vo + Ro)            |
    // |      Vu = ----------------------        |
    // |             (Qo - 1) * Vo - Ro          |
    // +-----------------------------------------+
    // |  Where:                                 |
    // |    Vu = Virtual balance undervalued     |
    // |    Vo = Virtual balance overvalued      |
    // |    Ru = Real balance undervalued        |
    // |    Ro = Real balance overvalued         |
    // |    Qo = Square root of price ratio      |
    // +-----------------------------------------+

    // Cap the duration (time between operations) at 30 days, to ensure `powDown` does not overflow.
    const duration = MathSol.min(
        currentTimestamp - lastTimestamp,
        thirtyDaysSeconds,
    );

    virtualBalanceOvervalued = MathSol.mulDownFixed(
        virtualBalanceOvervalued,
        MathSol.powDownFixed(dailyPriceShiftBase, duration * WAD),
    );

    // Ensure that Vo does not go below the minimum allowed value (corresponding to centeredness == 1).
    virtualBalanceOvervalued = MathSol.max(
        virtualBalanceOvervalued,
        MathSol.divDownFixed(
            balancesScaledOvervalued,
            sqrtScaled18(sqrtPriceRatio) - WAD,
        ),
    );

    virtualBalanceUndervalued =
        (balancesScaledUndervalued *
            (virtualBalanceOvervalued + balancesScaledOvervalued)) /
        (MathSol.mulDownFixed(sqrtPriceRatio - WAD, virtualBalanceOvervalued) -
            balancesScaledOvervalued);

    return isPoolAboveCenter
        ? [virtualBalanceUndervalued, virtualBalanceOvervalued]
        : [virtualBalanceOvervalued, virtualBalanceUndervalued];
}

/**
 * @notice Compute the price ratio of the pool by dividing the maximum price by the minimum price.
 * @dev The price ratio is calculated as maxPrice/minPrice, where maxPrice and minPrice are obtained
 * from computePriceRange.
 *
 * @param balancesScaled18 Current pool balances, sorted in token registration order
 * @param virtualBalanceA Virtual balance of token A
 * @param virtualBalanceB Virtual balance of token B
 * @return priceRatio The ratio between the maximum and minimum prices of the pool
 */
function computePriceRatio(
    balancesScaled18: bigint[],
    virtualBalanceA: bigint,
    virtualBalanceB: bigint,
): bigint {
    const { minPrice, maxPrice } = computePriceRange(
        balancesScaled18,
        virtualBalanceA,
        virtualBalanceB,
    );

    return MathSol.divUpFixed(maxPrice, minPrice);
}

/**
 * @notice Compute the minimum and maximum prices for the pool based on virtual balances and current invariant.
 * @dev The minimum price is calculated as Vb^2/invariant, where Vb is the virtual balance of token B.
 * The maximum price is calculated as invariant/Va^2, where Va is the virtual balance of token A.
 * These calculations are derived from the invariant equation: invariant = (Ra + Va)(Rb + Vb),
 * where Ra and Rb are the real balances of tokens A and B respectively.
 *
 * @param balancesScaled18 Current pool balances, sorted in token registration order
 * @param virtualBalanceA Virtual balance of token A
 * @param virtualBalanceB Virtual balance of token B
 * @return minPrice The minimum price of token A in terms of token B
 * @return maxPrice The maximum price of token A in terms of token B
 */
function computePriceRange(
    balancesScaled18: bigint[],
    virtualBalanceA: bigint,
    virtualBalanceB: bigint,
): { minPrice: bigint; maxPrice: bigint } {
    const currentInvariant = computeInvariant(
        balancesScaled18,
        virtualBalanceA,
        virtualBalanceB,
        Rounding.ROUND_DOWN,
    );

    // P_min(a) = Vb / (Va + Ra_max)
    // We don't have Ra_max, but: invariant=(Ra_max + Va)(Vb)
    // Then, (Va + Ra_max) = invariant/Vb, and:
    // P_min(a) = Vb^2 / invariant
    const minPrice = (virtualBalanceB * virtualBalanceB) / currentInvariant;

    // Similarly, P_max(a) = (Rb_max + Vb)/Va
    // We don't have Rb_max, but: invariant=(Rb_max + Vb)(Va)
    // Then, (Rb_max + Vb) = invariant/Va, and:
    // P_max(a) = invariant / Va^2
    const maxPrice = MathSol.divDownFixed(
        currentInvariant,
        MathSol.mulDownFixed(virtualBalanceA, virtualBalanceA),
    );

    return { minPrice, maxPrice };
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

    const currentFourthRootPriceRatio = MathSol.mulDownFixed(
        startFourthRootPriceRatio,
        MathSol.powDownFixed(
            MathSol.divDownFixed(
                endFourthRootPriceRatio,
                startFourthRootPriceRatio,
            ),
            exponent,
        ),
    );

    // Since we're rounding current fourth root price ratio down, we only need to check the lower boundary.
    const minimumFourthRootPriceRatio = MathSol.min(
        startFourthRootPriceRatio,
        endFourthRootPriceRatio,
    );
    return MathSol.max(
        minimumFourthRootPriceRatio,
        currentFourthRootPriceRatio,
    );
}

function computeCenteredness(
    balancesScaled18: bigint[],
    virtualBalanceA: bigint,
    virtualBalanceB: bigint,
): { poolCenteredness: bigint; isPoolAboveCenter: boolean } {
    if (balancesScaled18[a] === 0n) {
        // Also return false if both are 0 to be consistent with the logic below.
        return { poolCenteredness: 0n, isPoolAboveCenter: false };
    } else if (balancesScaled18[b] === 0n) {
        return { poolCenteredness: 0n, isPoolAboveCenter: true };
    }

    const numerator = balancesScaled18[a] * virtualBalanceB;
    const denominator = virtualBalanceA * balancesScaled18[b];

    let poolCenteredness: bigint;
    let isPoolAboveCenter: boolean;
    // The centeredness is defined between 0 and 1. If the numerator is greater than the denominator, we compute
    // the inverse ratio.
    if (numerator <= denominator) {
        poolCenteredness = MathSol.divDownFixed(numerator, denominator);
        isPoolAboveCenter = false;
    } else {
        poolCenteredness = MathSol.divDownFixed(denominator, numerator);
        isPoolAboveCenter = true;
    }

    return { poolCenteredness, isPoolAboveCenter };
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

/**
 * @notice Compute the `amountOut` of tokenOut in a swap, given the current balances and virtual balances.
 * @param balancesScaled18 Current pool balances, sorted in token registration order
 * @param virtualBalanceA The last virtual balance of token A
 * @param virtualBalanceB The last virtual balance of token B
 * @param tokenInIndex Index of the token being swapped in
 * @param tokenOutIndex Index of the token being swapped out
 * @param amountInScaled18 The exact amount of `tokenIn` (i.e., the amount given in an ExactIn swap)
 * @return amountOutScaled18 The calculated amount of `tokenOut` returned in an ExactIn swap
 */
export function computeOutGivenIn(
    balancesScaled18: bigint[],
    virtualBalanceA: bigint,
    virtualBalanceB: bigint,
    tokenInIndex: number,
    tokenOutIndex: number,
    amountInScaled18: bigint,
): bigint {
    // `amountOutScaled18 = currentTotalTokenOutPoolBalance - newTotalTokenOutPoolBalance`,
    // where `currentTotalTokenOutPoolBalance = balancesScaled18[tokenOutIndex] + virtualBalanceTokenOut`
    // and `newTotalTokenOutPoolBalance = invariant / (currentTotalTokenInPoolBalance + amountInScaled18)`.
    // In other words,
    // +--------------------------------------------------+
    // |                         L                        |
    // | Ao = Bo + Vo - ---------------------             |
    // |                   (Bi + Vi + Ai)                 |
    // +--------------------------------------------------+
    // Simplify by:
    // - replacing `L = (Bo + Vo) (Bi + Vi)`, and
    // - multiplying `(Bo + Vo)` by `(Bi + Vi + Ai) / (Bi + Vi + Ai)`:
    // +--------------------------------------------------+
    // |              (Bo + Vo) Ai                        |
    // | Ao = ------------------------------              |
    // |             (Bi + Vi + Ai)                       |
    // +--------------------------------------------------+
    // | Where:                                           |
    // |   Ao = Amount out                                |
    // |   Bo = Balance token out                         |
    // |   Vo = Virtual balance token out                 |
    // |   Ai = Amount in                                 |
    // |   Bi = Balance token in                          |
    // |   Vi = Virtual balance token in                  |
    // +--------------------------------------------------+
    const { virtualBalanceTokenIn, virtualBalanceTokenOut } =
        tokenInIndex === 0
            ? {
                  virtualBalanceTokenIn: virtualBalanceA,
                  virtualBalanceTokenOut: virtualBalanceB,
              }
            : {
                  virtualBalanceTokenIn: virtualBalanceB,
                  virtualBalanceTokenOut: virtualBalanceA,
              };

    const amountOutScaled18 =
        ((balancesScaled18[tokenOutIndex] + virtualBalanceTokenOut) *
            amountInScaled18) /
        (balancesScaled18[tokenInIndex] +
            virtualBalanceTokenIn +
            amountInScaled18);

    if (amountOutScaled18 > balancesScaled18[tokenOutIndex]) {
        // Amount out cannot be greater than the real balance of the token in the pool.
        throw new Error('reClammMath: AmountOutGreaterThanBalance');
    }

    return amountOutScaled18;
}

/**
 * @notice Compute the `amountIn` of tokenIn in a swap, given the current balances and virtual balances.
 * @param balancesScaled18 Current pool balances, sorted in token registration order
 * @param virtualBalanceA The last virtual balances of token A
 * @param virtualBalanceB The last virtual balances of token B
 * @param tokenInIndex Index of the token being swapped in
 * @param tokenOutIndex Index of the token being swapped out
 * @param amountOutScaled18 The exact amount of `tokenOut` (i.e., the amount given in an ExactOut swap)
 * @return amountInScaled18 The calculated amount of `tokenIn` returned in an ExactOut swap
 */
export function computeInGivenOut(
    balancesScaled18: bigint[],
    virtualBalanceA: bigint,
    virtualBalanceB: bigint,
    tokenInIndex: number,
    tokenOutIndex: number,
    amountOutScaled18: bigint,
): bigint {
    // `amountInScaled18 = newTotalTokenOutPoolBalance - currentTotalTokenInPoolBalance`,
    // where `newTotalTokenOutPoolBalance = invariant / (currentTotalTokenOutPoolBalance - amountOutScaled18)`
    // and `currentTotalTokenInPoolBalance = balancesScaled18[tokenInIndex] + virtualBalanceTokenIn`.
    // In other words,
    // +--------------------------------------------------+
    // |               L                                  |
    // | Ai = --------------------- - (Bi + Vi)           |
    // |         (Bo + Vo - Ao)                           |
    // +--------------------------------------------------+
    // Simplify by:
    // - replacing `L = (Bo + Vo) (Bi + Vi)`, and
    // - multiplying `(Bi + Vi)` by `(Bo + Vo - Ao) / (Bo + Vo - Ao)`:
    // +--------------------------------------------------+
    // |              (Bi + Vi) Ao                        |
    // | Ai = ------------------------------              |
    // |             (Bo + Vo - Ao)                       |
    // +--------------------------------------------------+
    // | Where:                                           |
    // |   Ao = Amount out                                |
    // |   Bo = Balance token out                         |
    // |   Vo = Virtual balance token out                 |
    // |   Ai = Amount in                                 |
    // |   Bi = Balance token in                          |
    // |   Vi = Virtual balance token in                  |
    // +--------------------------------------------------+

    if (amountOutScaled18 > balancesScaled18[tokenOutIndex]) {
        // Amount out cannot be greater than the real balance of the token in the pool.
        throw new Error('reClammMath: AmountOutGreaterThanBalance');
    }

    const { virtualBalanceTokenIn, virtualBalanceTokenOut } =
        tokenInIndex === 0
            ? {
                  virtualBalanceTokenIn: virtualBalanceA,
                  virtualBalanceTokenOut: virtualBalanceB,
              }
            : {
                  virtualBalanceTokenIn: virtualBalanceB,
                  virtualBalanceTokenOut: virtualBalanceA,
              };

    // Round up to favor the vault (i.e. request larger amount in from the user).
    const amountInScaled18 = MathSol.mulDivUpFixed(
        balancesScaled18[tokenInIndex] + virtualBalanceTokenIn,
        amountOutScaled18,
        balancesScaled18[tokenOutIndex] +
            virtualBalanceTokenOut -
            amountOutScaled18,
    );

    return amountInScaled18;
}

/**
 * @notice Calculate the square root of a value scaled by 18 decimals.
 * @param valueScaled18 The value to calculate the square root of, scaled by 18 decimals
 * @return sqrtValueScaled18 The square root of the value scaled by 18 decimals
 */
function sqrtScaled18(valueScaled18: bigint): bigint {
    return sqrt(valueScaled18 * WAD);
}

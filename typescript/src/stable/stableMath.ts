import { MathSol } from '../utils/math';

// Invariant growth limit: non-proportional add cannot cause the invariant to increase by more than this ratio.
export const _MIN_INVARIANT_RATIO = BigInt('600000000000000000'); // 60%
// Invariant shrink limit: non-proportional remove cannot cause the invariant to decrease by less than this ratio.
export const _MAX_INVARIANT_RATIO = BigInt('5000000000000000000'); // 500%

// For security reasons, to help ensure that for all possible "round trip" paths
// the caller always receives the same or fewer tokens than supplied,
// we have chosen the rounding direction to favor the protocol in all cases.
const AMP_PRECISION = 1000n;

// Note on unchecked arithmetic:
// This contract performs a large number of additions, subtractions, multiplications and divisions, often inside
// loops. Since many of these operations are gas-sensitive (as they happen e.g. during a swap), it is important to
// not make any unnecessary checks. We rely on a set of invariants to avoid having to use checked arithmetic,
// including:
//  - the amplification parameter is bounded by MAX_AMP * AMP_PRECISION, which fits in 23 bits
//
// This means e.g. we can safely multiply a balance by the amplification parameter without worrying about overflow.

// About swap fees on add and remove liquidity:
// Any add or remove that is not perfectly balanced (e.g. all single token operations) is mathematically
// equivalent to a perfectly balanced add or remove followed by a series of swaps. Since these swaps would charge
// swap fees, it follows that unbalanced adds and removes should as well.
// On these operations, we split the token amounts in 'taxable' and 'non-taxable' portions, where the 'taxable' part
// is the one to which swap fees are applied.

// Computes the invariant given the current balances, using the Newton-Raphson approximation.
// The amplification parameter equals: A n^(n-1)
// See: https://github.com/curvefi/curve-contract/blob/b0bbf77f8f93c9c5f4e415bce9cd71f0cdee960e/contracts/pool-templates/base/SwapTemplateBase.vy#L206
// solhint-disable-previous-line max-line-length
export const _computeInvariant = (
    amplificationParameter: bigint,
    balances: bigint[],
): bigint => {
    /**********************************************************************************************
        // invariant                                                                                 //
        // D = invariant                                                  D^(n+1)                    //
        // A = amplification coefficient      A  n^n S + D = A D n^n + -----------                   //
        // S = sum of balances                                             n^n P                     //
        // P = product of balances                                                                   //
        // n = number of tokens                                                                      //
        **********************************************************************************************/

    // Always round down, to match Vyper's arithmetic (which always truncates).
    let sum = 0n; // S in the Curve version
    const numTokens = balances.length;
    for (let i = 0; i < numTokens; i++) {
        sum = sum + balances[i];
    }
    if (sum === 0n) {
        return 0n;
    }

    let prevInvariant: bigint; // Dprev in the Curve version
    let invariant = sum; // D in the Curve version
    const ampTimesTotal = amplificationParameter * BigInt(numTokens); // Ann in the Curve version

    for (let i = 0; i < 255; i++) {
        let D_P = invariant;
        for (let j = 0; j < numTokens; ++j) {
            D_P = (D_P * invariant) / (balances[j] * BigInt(numTokens));
        }

        prevInvariant = invariant;

        invariant =
            (((ampTimesTotal * sum) / AMP_PRECISION + D_P * BigInt(numTokens)) *
                invariant) /
            (((ampTimesTotal - AMP_PRECISION) * invariant) / AMP_PRECISION +
                (BigInt(numTokens) + 1n) * D_P);

        // We are explicitly checking the magnitudes here, so can use unchecked math.
        if (invariant > prevInvariant) {
            if (invariant - prevInvariant <= 1) {
                return invariant;
            }
        } else if (prevInvariant - invariant <= 1) {
            return invariant;
        }
    }

    throw new Error('StableInvariantDidntConverge()');
};

// Computes how many tokens can be taken out of a pool if `tokenAmountIn` are sent, given the current balances.
// The amplification parameter equals: A n^(n-1)
export function _computeOutGivenExactIn(
    amplificationParameter: bigint,
    balances: bigint[],
    tokenIndexIn: number,
    tokenIndexOut: number,
    tokenAmountIn: bigint,
    invariant: bigint,
): bigint {
    /**************************************************************************************************************
        // outGivenExactIn token x for y - polynomial equation to solve                                              //
        // ay = amount out to calculate                                                                              //
        // by = balance token out                                                                                    //
        // y = by - ay (finalBalanceOut)                                                                             //
        // D = invariant                                               D                     D^(n+1)                 //
        // A = amplification coefficient               y^2 + ( S + ----------  - D) * y -  ------------- = 0         //
        // n = number of tokens                                    (A * n^n)               A * n^2n * P              //
        // S = sum of final balances but y                                                                           //
        // P = product of final balances but y                                                                       //
        **************************************************************************************************************/

    // Amount out, so we round down overall.
    balances[tokenIndexIn] += tokenAmountIn;

    const finalBalanceOut = _computeBalance(
        amplificationParameter,
        balances,
        invariant,
        tokenIndexOut,
    );

    // No need to use checked arithmetic since `tokenAmountIn` was actually added to the same balance right before
    // calling `_getTokenBalanceGivenInvariantAndAllOtherBalances` which doesn't alter the balances array.
    balances[tokenIndexIn] -= tokenAmountIn;

    return balances[tokenIndexOut] - finalBalanceOut - 1n;
}

// Computes how many tokens must be sent to a pool if `tokenAmountOut` are sent given the
// current balances, using the Newton-Raphson approximation.
// The amplification parameter equals: A n^(n-1)
export function _computeInGivenExactOut(
    amplificationParameter: bigint,
    balances: bigint[],
    tokenIndexIn: number,
    tokenIndexOut: number,
    tokenAmountOut: bigint,
    invariant: bigint,
): bigint {
    /**************************************************************************************************************
        // inGivenExactOut token x for y - polynomial equation to solve                                              //
        // ax = amount in to calculate                                                                               //
        // bx = balance token in                                                                                     //
        // x = bx + ax (finalBalanceIn)                                                                              //
        // D = invariant                                                D                     D^(n+1)                //
        // A = amplification coefficient               x^2 + ( S + ----------  - D) * x -  ------------- = 0         //
        // n = number of tokens                                     (A * n^n)               A * n^2n * P             //
        // S = sum of final balances but x                                                                           //
        // P = product of final balances but x                                                                       //
        **************************************************************************************************************/

    // Amount in, so we round up overall.
    balances[tokenIndexOut] -= tokenAmountOut;

    const finalBalanceIn = _computeBalance(
        amplificationParameter,
        balances,
        invariant,
        tokenIndexIn,
    );

    // No need to use checked arithmetic since `tokenAmountOut` was actually subtracted from the same balance right
    // before calling `_getTokenBalanceGivenInvariantAndAllOtherBalances` which doesn't alter the balances array.
    balances[tokenIndexOut] += tokenAmountOut;

    return finalBalanceIn - balances[tokenIndexIn] + 1n;
}

// This function calculates the balance of a given token (tokenIndex)
// given all the other balances and the invariant.
export function _computeBalance(
    amplificationParameter: bigint,
    balances: bigint[],
    invariant: bigint,
    tokenIndex: number,
): bigint {
    // Rounds result up overall.
    const numTokens = balances.length;
    const ampTimesTotal = amplificationParameter * BigInt(numTokens);
    let sum = balances[0];
    let P_D = balances[0] * BigInt(numTokens);
    for (let j = 1; j < numTokens; ++j) {
        P_D = (P_D * balances[j] * BigInt(numTokens)) / invariant;
        sum = sum + balances[j];
    }
    sum = sum - balances[tokenIndex];

    // Use divUpRaw with inv2, as it is a "raw" 36 decimal value.
    const inv2 = invariant * invariant;
    // We remove the balance from c by multiplying it.
    const c =
        MathSol.divUp(inv2 * AMP_PRECISION, ampTimesTotal * P_D) *
        balances[tokenIndex];

    const b = sum + (invariant * AMP_PRECISION) / ampTimesTotal;
    // We iterate to find the balance.
    let prevTokenBalance = 0n;
    // We multiply the first iteration outside the loop with the invariant to set the value of the
    // initial approximation.
    let tokenBalance = MathSol.divUp(inv2 + c, invariant + b);

    for (let i = 0; i < 255; ++i) {
        prevTokenBalance = tokenBalance;

        // Use divUpRaw with tokenBalance, as it is a "raw" 36 decimal value.
        tokenBalance = MathSol.divUp(
            tokenBalance * tokenBalance + c,
            tokenBalance * 2n + b - invariant,
        );

        // We are explicitly checking the magnitudes here, so can use unchecked math.
        if (tokenBalance > prevTokenBalance) {
            if (tokenBalance - prevTokenBalance <= 1) {
                return tokenBalance;
            }
        } else if (prevTokenBalance - tokenBalance <= 1) {
            return tokenBalance;
        }
    }

    throw new Error('StableGetBalanceDidntConverge()');
}

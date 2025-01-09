// The invariant is used to calculate the virtual offsets used in swaps.
// It is also used to collect protocol swap fees by comparing its value between two times.
// We can always round in the same direction. It is also used to initialize the BPT amount and,

import { FixedPointFunction, MathSol, WAD } from '../utils/math';
import { Rounding } from '../vault/types';
import { GyroPoolMath } from './gyroPoolMath';

// because there is a minimum BPT, we round the invariant down.
export function calculateInvariant(
    balances: bigint[],
    sqrtAlpha: bigint,
    sqrtBeta: bigint,
    rounding: Rounding,
): bigint {
    /**********************************************************************************************
    // Calculate with quadratic formula
    // 0 = (1-sqrt(alpha/beta)*L^2 - (y/sqrt(beta)+x*sqrt(alpha))*L - x*y)
    // 0 = a*L^2 + b*L + c
    // here a > 0, b < 0, and c < 0, which is a special case that works well w/o negative numbers
    // taking mb = -b and mc = -c:                               (1/2)
    //                                  mb + (mb^2 + 4 * a * mc)^                   //
    //                   L =    ------------------------------------------          //
    //                                          2 * a                               //
    //                                                                              //
    **********************************************************************************************/
    const { a, mb, bSquare, mc } = calculateQuadraticTerms(
        balances,
        sqrtAlpha,
        sqrtBeta,
        rounding,
    );

    return calculateQuadratic(a, mb, bSquare, mc);
}

/**
 * @notice Prepares quadratic terms for input to _calculateQuadratic.
 * @dev It uses a special case of the quadratic formula that works nicely without negative numbers, and
 * assumes a > 0, b < 0, and c <= 0.
 *
 * @param balances Pool balances
 * @param sqrtAlpha Square root of Gyro's 2CLP alpha parameter
 * @param sqrtBeta Square root of Gyro's 2CLP beta parameter
 * @param rounding Rounding direction of the invariant, which will be calculated using the quadratic terms
 * @return a Bhaskara's `a` term
 * @return mb Bhaskara's `b` term, negative (stands for minus b)
 * @return bSquare Bhaskara's `b^2` term. The calculation is optimized to be more precise than just b*b
 * @return mc Bhaskara's `c` term, negative (stands for minus c)
 */
function calculateQuadraticTerms(
    balances: bigint[],
    sqrtAlpha: bigint,
    sqrtBeta: bigint,
    rounding: Rounding,
): { a: bigint; mb: bigint; bSquare: bigint; mc: bigint } {
    const _divUpOrDown: FixedPointFunction =
        rounding === Rounding.ROUND_DOWN
            ? MathSol.divDownFixed
            : MathSol.divUpFixed;

    const _mulUpOrDown: FixedPointFunction =
        rounding === Rounding.ROUND_DOWN
            ? MathSol.mulDownFixed
            : MathSol.mulUpFixed;

    const _mulDownOrUp: FixedPointFunction =
        rounding === Rounding.ROUND_DOWN
            ? MathSol.mulUpFixed
            : MathSol.mulDownFixed;

    // `a` follows the opposite rounding than `b` and `c`, since the most significant term is in the
    // denominator of Bhaskara's formula. To round the invariant up, we need to round `a` down, which means that
    // the division `sqrtAlpha/sqrtBeta` needs to be rounded up. In other words, if the given rounding
    // direction is UP, 'a' will be rounded DOWN and vice versa.
    const a = WAD - _divUpOrDown(sqrtAlpha, sqrtBeta);

    // `b` is a term in the numerator and should be rounded up if we want to increase the invariant.
    const bterm0 = _divUpOrDown(balances[1], sqrtBeta);
    const bterm1 = _mulUpOrDown(balances[0], sqrtAlpha);
    const mb = bterm0 + bterm1;
    // `c` is a term in the numerator and should be rounded up if we want to increase the invariant.
    const mc = _mulUpOrDown(balances[0], balances[1]);

    // For better fixed point precision, calculate in expanded form, re-ordering multiplications.
    // `b^2 = x^2 * alpha + x*y*2*sqrt(alpha/beta) + y^2 / beta`
    let bSquare = _mulUpOrDown(
        _mulUpOrDown(_mulUpOrDown(balances[0], balances[0]), sqrtAlpha),
        sqrtAlpha,
    );
    const bSq2 = _divUpOrDown(
        2n * _mulUpOrDown(_mulUpOrDown(balances[0], balances[1]), sqrtAlpha),
        sqrtBeta,
    );
    const bSq3 = _divUpOrDown(
        _mulUpOrDown(balances[1], balances[1]),
        _mulDownOrUp(sqrtBeta, sqrtBeta),
    );
    bSquare = bSquare + bSq2 + bSq3;
    return { a, mb, bSquare, mc };
}

/**
 * @dev Calculates the quadratic root for a special case of the quadratic formula.
 *   assumes a > 0, b < 0, and c <= 0, which is the case for a L^2 + b L + c = 0
 *   where   a = 1 - sqrt(alpha/beta)
 *           b = -(y/sqrt(beta) + x*sqrt(alpha))
 *           c = -x*y
 *   The special case works nicely without negative numbers.
 *   The args use the notation "mb" to represent -b, and "mc" to represent -c
 *   Note that this calculation underestimates the solution.
 */
function calculateQuadratic(
    a: bigint,
    mb: bigint,
    bSquare: bigint, // b^2 can be calculated separately with more precision
    mc: bigint,
): bigint {
    const denominator = MathSol.mulUpFixed(a, 2n * WAD);
    // Order multiplications for fixed point precision.
    const addTerm = MathSol.mulDownFixed(MathSol.mulDownFixed(mc, 4n * WAD), a);
    // The minus sign in the radicand cancels out in this special case.
    const radicand = bSquare + addTerm;
    const sqrResult = GyroPoolMath.sqrt(radicand, 5n);
    // The minus sign in the numerator cancels out in this special case.
    const numerator = mb + sqrResult;
    const invariant = MathSol.divDownFixed(numerator, denominator);
    return invariant;
}

/**
 * @dev Computes how many tokens can be taken out of a pool if `amountIn' are sent, given current balances.
 *   balanceIn = existing balance of input token
 *   balanceOut = existing balance of requested output token
 *   virtualParamIn = virtual reserve offset for input token
 *   virtualParamOut = virtual reserve offset for output token
 *   Offsets are L/sqrt(beta) and L*sqrt(alpha) depending on what the `in' and `out' tokens are respectively
 *   Note signs are changed compared to Prop. 4 in Section 2.2.4 Trade (Swap) Execution to account for dy < 0
 *
 *   The virtualOffset argument depends on the computed invariant. We add a very small margin to ensure that
 *   potential small errors are not to the detriment of the pool.
 *
 *   There is a corresponding function in the 3CLP, except that there we allow two different virtual "in" and
 *   "out" assets.
 *   SOMEDAY: This could be made literally the same function in the pool math library.
 */
export function calcOutGivenIn(
    balanceIn: bigint,
    balanceOut: bigint,
    amountIn: bigint,
    virtualOffsetIn: bigint,
    virtualOffsetOut: bigint,
): bigint {
    /**********************************************************************************************
     // Described for X = `in' asset and Y = `out' asset, but equivalent for the other case       //
    // dX = incrX  = amountIn  > 0                                                               //
    // dY = incrY = amountOut < 0                                                                //
    // x = balanceIn             x' = x +  virtualParamX                                         //
    // y = balanceOut            y' = y +  virtualParamY                                         //
    // L  = inv.Liq                   /            x' * y'          \          y' * dX           //
    //                   |dy| = y' - |   --------------------------  |   = --------------  -     //
    //  x' = virtIn                   \          ( x' + dX)         /          x' + dX           //
    //  y' = virtOut                                                                             //
    // Note that -dy > 0 is what the trader receives.                                            //
    // We exploit the fact that this formula is symmetric up to virtualOffset{X,Y}.               //
    // We do not use L^2, but rather x' * y', to prevent a potential accumulation of errors.      //
    // We add a very small safety margin to compensate for potential errors in the invariant.     //
    **********************************************************************************************/

    // The factors in total lead to a multiplicative "safety margin" between the employed virtual offsets
    // that is very slightly larger than 3e-18.
    const virtInOver =
        balanceIn + MathSol.mulUpFixed(virtualOffsetIn, WAD + 2n);
    const virtOutUnder =
        balanceOut + MathSol.mulDownFixed(virtualOffsetOut, WAD - 1n);

    const amountOut = MathSol.divDownFixed(
        MathSol.mulDownFixed(virtOutUnder, amountIn),
        virtInOver + amountIn,
    );

    // This ensures amountOut < balanceOut.
    if (!(amountOut <= balanceOut)) {
        throw Error('AssetBoundsExceeded');
    }
    return amountOut;
}

/**
 * @dev Computes how many tokens must be sent to a pool in order to take `amountOut`, given current balances.
 * See also _calcOutGivenIn(). Adapted for negative values.
 */
export function calcInGivenOut(
    balanceIn: bigint,
    balanceOut: bigint,
    amountOut: bigint,
    virtualOffsetIn: bigint,
    virtualOffsetOut: bigint,
): bigint {
    /**********************************************************************************************
      // dX = incrX  = amountIn  > 0                                                                 //
      // dY = incrY  = amountOut < 0                                                                 //
      // x = balanceIn             x' = x +  virtualParamX                                           //
      // y = balanceOut            y' = y +  virtualParamY                                           //
      // x = balanceIn                                                                               //
      // L  = inv.Liq               /            x' * y'          \                x' * dy           //
      //                     dx =  |   --------------------------  |  -  x'  = - -----------         //
      // x' = virtIn               \             y' + dy          /                y' + dy           //
      // y' = virtOut                                                                                //
      // Note that dy < 0 < dx.                                                                      //
      // We exploit the fact that this formula is symmetric up to virtualOffset{X,Y}.                //
      // We do not use L^2, but rather x' * y', to prevent a potential accumulation of errors.       //
      // We add a very small safety margin to compensate for potential errors in the invariant.      //
      **********************************************************************************************/
    if (!(amountOut <= balanceOut)) {
        throw Error('AssetBoundsExceeded');
    }

    // The factors in total lead to a multiplicative "safety margin" between the employed virtual offsets
    // that is very slightly larger than 3e-18.
    const virtInOver =
        balanceIn + MathSol.mulUpFixed(virtualOffsetIn, WAD + 2n);
    const virtOutUnder =
        balanceOut + MathSol.mulDownFixed(virtualOffsetOut, WAD - 1n);

    const amountIn = MathSol.divUpFixed(
        MathSol.mulUpFixed(virtInOver, amountOut),
        virtOutUnder - amountOut,
    );
    return amountIn;
}

/// @dev Calculate the virtual offset `a` for reserves `x`, as in (x+a)*(y+b)=L^2.
export function calculateVirtualParameter0(
    invariant: bigint,
    _sqrtBeta: bigint,
    rounding: Rounding,
): bigint {
    return rounding === Rounding.ROUND_DOWN
        ? MathSol.divDownFixed(invariant, _sqrtBeta)
        : MathSol.divUpFixed(invariant, _sqrtBeta);
}

/// @dev Calculate the virtual offset `b` for reserves `y`, as in (x+a)*(y+b)=L^2.
export function calculateVirtualParameter1(
    invariant: bigint,
    _sqrtAlpha: bigint,
    rounding: Rounding,
): bigint {
    return rounding === Rounding.ROUND_DOWN
        ? MathSol.mulDownFixed(invariant, _sqrtAlpha)
        : MathSol.mulUpFixed(invariant, _sqrtAlpha);
}

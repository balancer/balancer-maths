import { MAX_UINT256, MAX_BALANCE } from '../constants';
import {
    MaxSingleTokenRemoveParams,
    MaxSwapParams,
    type PoolBase,
    Rounding,
    SwapKind,
    type SwapParams,
} from '../vault/types';
import { toRawUndoRateRoundDown } from '../vault/utils';
import { MathSol } from '../utils/math';
import { Gyro2CLPImmutable } from './gyro2CLPData';
import {
    calcInGivenOut,
    calcOutGivenIn,
    calculateInvariant,
    calculateVirtualParameter0,
    calculateVirtualParameter1,
} from './gyro2CLPMath';

export class Gyro2CLP implements PoolBase {
    public _sqrtAlpha: bigint;
    public _sqrtBeta: bigint;

    constructor(poolState: Gyro2CLPImmutable) {
        if (poolState.sqrtAlpha >= poolState.sqrtBeta) {
            throw Error('SqrtParamsWrong');
        }

        this._sqrtAlpha = poolState.sqrtAlpha;
        this._sqrtBeta = poolState.sqrtBeta;
    }

    getMaximumInvariantRatio(): bigint {
        return MAX_UINT256;
    }

    getMinimumInvariantRatio(): bigint {
        return 0n;
    }

    /**
     * Returns the max amount that can be swapped in relation to the swapKind.
     * @param maxSwapParams
     * @returns GivenIn: Returns the max amount in. GivenOut: Returns the max amount out.
     */
    getMaxSwapAmount(maxSwapParams: MaxSwapParams): bigint {
        const {
            balancesLiveScaled18,
            indexIn,
            indexOut,
            tokenRates,
            scalingFactors,
            swapKind,
        } = maxSwapParams;
        if (swapKind === SwapKind.GivenIn) {
            // MAX_BALANCE comes from SC limit and is max pool can hold
            const diff = MAX_BALANCE - balancesLiveScaled18[indexIn];
            // Scale to token in (and remove rate)
            return toRawUndoRateRoundDown(
                diff,
                scalingFactors[indexIn],
                tokenRates[indexIn],
            );
        }
        // 99% of token out balance
        const max = MathSol.mulDownFixed(
            990000000000000000n,
            balancesLiveScaled18[indexOut],
        );
        // Scale to token out
        return toRawUndoRateRoundDown(
            max,
            scalingFactors[indexOut],
            tokenRates[indexOut],
        );
    }

    getMaxSingleTokenAddAmount(): bigint {
        return MAX_UINT256;
    }

    getMaxSingleTokenRemoveAmount(
        maxRemoveParams: MaxSingleTokenRemoveParams,
    ): bigint {
        const {
            isExactIn,
            totalSupply,
            tokenOutBalance,
            tokenOutScalingFactor,
            tokenOutRate,
        } = maxRemoveParams;
        return this.getMaxSwapAmount({
            swapKind: isExactIn ? SwapKind.GivenIn : SwapKind.GivenOut,
            balancesLiveScaled18: [totalSupply, tokenOutBalance],
            tokenRates: [1000000000000000000n, tokenOutRate],
            scalingFactors: [1000000000000000000n, tokenOutScalingFactor],
            indexIn: 0,
            indexOut: 1,
        });
    }

    onSwap(swapParams: SwapParams): bigint {
        const {
            swapKind,
            balancesLiveScaled18: balancesScaled18,
            indexIn,
            indexOut,
            amountGivenScaled18,
        } = swapParams;

        const tokenInIsToken0 = indexIn == 0;
        const balanceTokenInScaled18 = balancesScaled18[indexIn];
        const balanceTokenOutScaled18 = balancesScaled18[indexOut];

        const { virtualBalanceIn, virtualBalanceOut } = this._getVirtualOffsets(
            balanceTokenInScaled18,
            balanceTokenOutScaled18,
            tokenInIsToken0,
        );

        if (swapKind === SwapKind.GivenIn) {
            const amountOutScaled18 = calcOutGivenIn(
                balanceTokenInScaled18,
                balanceTokenOutScaled18,
                amountGivenScaled18,
                virtualBalanceIn,
                virtualBalanceOut,
            );
            return amountOutScaled18;
        }
        const amountInScaled18 = calcInGivenOut(
            balanceTokenInScaled18,
            balanceTokenOutScaled18,
            amountGivenScaled18,
            virtualBalanceIn,
            virtualBalanceOut,
        );

        return amountInScaled18;
    }

    computeInvariant(
        balancesLiveScaled18: bigint[],
        rounding: Rounding,
    ): bigint {
        return calculateInvariant(
            balancesLiveScaled18,
            this._sqrtAlpha,
            this._sqrtBeta,
            rounding,
        );
    }

    computeBalance(
        balancesLiveScaled18: bigint[],
        tokenInIndex: number,
        invariantRatio: bigint,
    ): bigint {
        /**********************************************************************************************
        // Gyro invariant formula is:
        //                                    Lˆ2 = (x + a)(y + b)
        // where:
        //   a = L / _sqrtBeta
        //   b = L * _sqrtAlpha
        //
        // In computeBalance, we want to know the new balance of a token, given that the invariant
        // changed and the other token balance didn't change. To calculate that for "x", we use:
        //
        //            (L*Lratio)ˆ2 = (newX + (L*Lratio) / _sqrtBeta)(y + (L*Lratio) * _sqrtAlpha)
        //
        // To simplify, let's rename a few terms:
        //
        //                                       squareNewInv = (newX + a)(y + b)
        //
        // Isolating newX:                       newX = (squareNewInv/(y + b)) - a
        // For newY:                             newY = (squareNewInv/(x + a)) - b
        **********************************************************************************************/

        // `computeBalance` is used to calculate unbalanced adds and removes, when the BPT value is specified.
        // A bigger invariant in `computeAddLiquiditySingleTokenExactOut` means that more tokens are required to
        // fulfill the trade, and a bigger invariant in `computeRemoveLiquiditySingleTokenExactIn` means that the
        // amount out is lower. So, the invariant should always be rounded up.
        let invariant = calculateInvariant(
            balancesLiveScaled18,
            this._sqrtAlpha,
            this._sqrtBeta,
            Rounding.ROUND_UP,
        );
        // New invariant
        invariant = MathSol.mulUpFixed(invariant, invariantRatio);
        const squareNewInv = invariant * invariant;
        // L / sqrt(beta)
        const a = MathSol.divDownFixed(invariant, this._sqrtBeta);
        // L * sqrt(alpha)
        const b = MathSol.mulDownFixed(invariant, this._sqrtAlpha);

        let newBalance = 0n;
        if (tokenInIndex === 0) {
            // if newBalance = newX
            newBalance =
                MathSol.divUp(squareNewInv, balancesLiveScaled18[1] + b) - a;
        } else {
            // if newBalance = newY
            newBalance =
                MathSol.divUp(squareNewInv, balancesLiveScaled18[0] + a) - b;
        }
        return newBalance;
    }

    /**
     * @notice Return the virtual offsets of each token of the 2CLP pool.
     * @dev The 2CLP invariant is defined as `L=(x+a)(y+b)`. "x" and "y" are the real balances, and "a" and "b" are
     * offsets to concentrate the liquidity of the pool. The sum of real balance and offset is known as
     * "virtual balance". Here we return the offsets a and b.
     */
    _getVirtualOffsets(
        balanceTokenInScaled18: bigint,
        balanceTokenOutScaled18: bigint,
        tokenInIsToken0: boolean,
    ): { virtualBalanceIn: bigint; virtualBalanceOut: bigint } {
        const balances = new Array(2).fill(0n);
        balances[0] = tokenInIsToken0
            ? balanceTokenInScaled18
            : balanceTokenOutScaled18;
        balances[1] = tokenInIsToken0
            ? balanceTokenOutScaled18
            : balanceTokenInScaled18;

        const currentInvariant = calculateInvariant(
            balances,
            this._sqrtAlpha,
            this._sqrtBeta,
            Rounding.ROUND_DOWN,
        );

        // virtualBalanceIn is always rounded up, because:
        // * If swap is EXACT_IN: a bigger virtualBalanceIn leads to a lower amount out;
        // * If swap is EXACT_OUT: a bigger virtualBalanceIn leads to a bigger amount in;
        // virtualBalanceOut is always rounded down, because:
        // * If swap is EXACT_IN: a lower virtualBalanceOut leads to a lower amount out;
        // * If swap is EXACT_OUT: a lower virtualBalanceOut leads to a bigger amount in;
        let virtualBalanceIn = 0n;
        let virtualBalanceOut = 0n;
        if (tokenInIsToken0) {
            virtualBalanceIn = calculateVirtualParameter0(
                currentInvariant,
                this._sqrtBeta,
                Rounding.ROUND_UP,
            );
            virtualBalanceOut = calculateVirtualParameter1(
                currentInvariant,
                this._sqrtAlpha,
                Rounding.ROUND_DOWN,
            );
        } else {
            virtualBalanceIn = calculateVirtualParameter1(
                currentInvariant,
                this._sqrtAlpha,
                Rounding.ROUND_UP,
            );
            virtualBalanceOut = calculateVirtualParameter0(
                currentInvariant,
                this._sqrtBeta,
                Rounding.ROUND_DOWN,
            );
        }

        return {
            virtualBalanceIn,
            virtualBalanceOut,
        };
    }
}

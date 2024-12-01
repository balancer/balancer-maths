import { MAX_UINT256, MAX_BALANCE } from '../constants';
import { MathSol } from '../utils/math';
import {
    MaxSingleTokenRemoveParams,
    MaxSwapParams,
    type PoolBase,
    Rounding,
    SwapKind,
    type SwapParams,
} from '../vault/types';
import { StableMutable } from './data';
import {
    _computeOutGivenExactIn,
    _computeInGivenExactOut,
    _computeInvariant,
    _computeBalance,
} from './stableMath';

export class Stable implements PoolBase {
    public amp: bigint;

    constructor(poolState: StableMutable) {
        this.amp = poolState.amp;
    }

    /**
     * Returns the max amount that can be swapped (in relation to the amount specified by user).
     * @param maxSwapParams
     * @returns Returned amount/scaling is respective to the tokenOut because that’s what we’re taking out of the pool and what limits the swap size.
     */
    getMaxSwapAmount(maxSwapParams: MaxSwapParams): bigint {
        const { balancesLiveScaled18, indexIn, tokenRates, scalingFactors } =
            maxSwapParams;

        const diff = MAX_BALANCE - balancesLiveScaled18[indexIn];
        return MathSol.divDownFixed(
            diff,
            scalingFactors[indexIn] * tokenRates[indexIn],
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
        const invariant = _computeInvariant(this.amp, balancesScaled18);

        if (swapKind === SwapKind.GivenIn) {
            return _computeOutGivenExactIn(
                this.amp,
                balancesScaled18,
                indexIn,
                indexOut,
                amountGivenScaled18,
                invariant,
            );
        }
        return _computeInGivenExactOut(
            this.amp,
            balancesScaled18,
            indexIn,
            indexOut,
            amountGivenScaled18,
            invariant,
        );
    }
    computeInvariant(
        balancesLiveScaled18: bigint[],
        rounding: Rounding,
    ): bigint {
        let invariant = _computeInvariant(this.amp, balancesLiveScaled18);
        if (invariant > 0) {
            invariant =
                rounding == Rounding.ROUND_DOWN ? invariant : invariant + 1n;
        }
        return invariant;
    }
    computeBalance(
        balancesLiveScaled18: bigint[],
        tokenInIndex: number,
        invariantRatio: bigint,
    ): bigint {
        return _computeBalance(
            this.amp,
            balancesLiveScaled18,
            MathSol.mulUpFixed(
                this.computeInvariant(balancesLiveScaled18, Rounding.ROUND_UP),
                invariantRatio,
            ),
            tokenInIndex,
        );
    }
}

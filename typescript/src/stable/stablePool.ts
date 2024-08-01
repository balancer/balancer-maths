import { MAX_UINT256 } from '../constants';
import { MathSol } from '../utils/math';
import {
    MaxSingleTokenRemoveParams,
    MaxSwapParams,
    type PoolBase,
    SwapKind,
    type SwapParams,
} from '../vault/types';
import {
    _computeOutGivenExactIn,
    _computeInGivenExactOut,
    _computeInvariant,
    _computeBalance,
} from './stableMath';

export class Stable implements PoolBase {
    public amp: bigint;

    constructor(poolState: { amp: bigint }) {
        this.amp = poolState.amp;
    }

    /**
     * Returns the max amount that can be swapped (in relation to the amount specified by user).
     * @param maxSwapParams
     * @returns Returned amount/scaling is respective to the tokenOut because that’s what we’re taking out of the pool and what limits the swap size.
     */
    getMaxSwapAmount(maxSwapParams: MaxSwapParams): bigint {
        const {
            swapKind,
            balancesLiveScaled18,
            indexIn,
            indexOut,
            tokenRates,
            scalingFactors,
        } = maxSwapParams;
        if (swapKind === SwapKind.GivenIn)
            return MathSol.divDownFixed(
                MathSol.mulDownFixed(
                    balancesLiveScaled18[indexOut],
                    MathSol.divDownFixed(
                        tokenRates[indexOut],
                        tokenRates[indexIn],
                    ),
                ),
                scalingFactors[indexIn],
            );
        return MathSol.divDownFixed(
            balancesLiveScaled18[indexOut],
            scalingFactors[indexOut],
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
    computeInvariant(balancesLiveScaled18: bigint[]): bigint {
        return _computeInvariant(this.amp, balancesLiveScaled18);
    }
    computeBalance(
        balancesLiveScaled18: bigint[],
        tokenInIndex: number,
        invariantRatio: bigint,
    ): bigint {
        return _computeBalance(
            this.amp,
            balancesLiveScaled18,
            MathSol.mulDownFixed(
                this.computeInvariant(balancesLiveScaled18),
                invariantRatio,
            ),
            tokenInIndex,
        );
    }
}

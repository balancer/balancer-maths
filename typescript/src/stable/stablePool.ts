import { MAX_UINT256, MAX_BALANCE } from '../constants';
import { MathSol } from '../utils/math';
import { toRawUndoRateRoundDown } from '../vault/utils';
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

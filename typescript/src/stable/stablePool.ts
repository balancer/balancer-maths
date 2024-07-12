import { MathSol } from '../utils/math';
import {
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

    constructor(poolState: {
        amp: bigint;
    }) {
        this.amp = poolState.amp;
    }

    getMaxSwapAmount(maxSwapParams: MaxSwapParams): bigint {
        const {
            swapKind,
            balancesLiveScaled18,
            indexIn,
            indexOut,
            tokenRates,
        } = maxSwapParams;
        if (swapKind === SwapKind.GivenIn)
            return MathSol.mulDownFixed(
                balancesLiveScaled18[indexOut],
                MathSol.divDownFixed(tokenRates[indexOut], tokenRates[indexIn]),
            );
        return balancesLiveScaled18[indexOut];
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

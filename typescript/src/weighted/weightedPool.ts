import { type PoolBase, SwapKind, type SwapParams } from '../vault/types';
import {
    _computeOutGivenExactIn,
    _computeInGivenExactOut,
    _computeInvariant,
    _computeBalanceOutGivenInvariant,
} from './weightedMath';

export class Weighted implements PoolBase {
    public normalizedWeights: bigint[];

    constructor(poolState: {
        weights: bigint[];
    }) {
        this.normalizedWeights = poolState.weights;
    }

    onSwap(swapParams: SwapParams): bigint {
        const {
            swapKind,
            balancesLiveScaled18: balancesScaled18,
            indexIn,
            indexOut,
            amountGivenScaled18,
        } = swapParams;
        if (swapKind === SwapKind.GivenIn) {
            return _computeOutGivenExactIn(
                balancesScaled18[indexIn],
                this.normalizedWeights[indexIn],
                balancesScaled18[indexOut],
                this.normalizedWeights[indexOut],
                amountGivenScaled18,
            );
        }
        return _computeInGivenExactOut(
            balancesScaled18[indexIn],
            this.normalizedWeights[indexIn],
            balancesScaled18[indexOut],
            this.normalizedWeights[indexOut],
            amountGivenScaled18,
        );
    }
    computeInvariant(balancesLiveScaled18: bigint[]): bigint {
        return _computeInvariant(this.normalizedWeights, balancesLiveScaled18);
    }
    computeBalance(
        balancesLiveScaled18: bigint[],
        tokenInIndex: number,
        invariantRatio: bigint,
    ): bigint {
        return _computeBalanceOutGivenInvariant(
            balancesLiveScaled18[tokenInIndex],
            this.normalizedWeights[tokenInIndex],
            invariantRatio,
        );
    }
}

import { MAX_UINT256 } from '../constants';
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
    _computeBalanceOutGivenInvariant,
    _MAX_IN_RATIO,
    _MAX_OUT_RATIO,
} from './weightedMath';

export class Weighted implements PoolBase {
    public normalizedWeights: bigint[];

    constructor(poolState: { weights: bigint[] }) {
        this.normalizedWeights = poolState.weights;
    }

    getMaxSwapAmount(swapParams: MaxSwapParams): bigint {
        if (swapParams.swapKind === SwapKind.GivenIn)
            return MathSol.divDownFixed(
                MathSol.mulDownFixed(
                    swapParams.balancesLiveScaled18[swapParams.indexIn],
                    _MAX_IN_RATIO,
                ),
                swapParams.scalingFactors[swapParams.indexIn],
            );
        return MathSol.divDownFixed(
            MathSol.mulDownFixed(
                swapParams.balancesLiveScaled18[swapParams.indexOut],
                _MAX_OUT_RATIO,
            ),
            swapParams.scalingFactors[swapParams.indexOut],
        );
    }

    getMaxSingleTokenAddAmount(): bigint {
        return MAX_UINT256;
    }

    getMaxSingleTokenExitAmount(
        isExactIn: boolean,
        totalSupply: bigint,
        tokenOutBalance: bigint,
        tokenOutScalingFactor: bigint,
        tokenOutRate: bigint,
    ): bigint {
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

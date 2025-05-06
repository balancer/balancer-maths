import {
    _computeBalanceOutGivenInvariant,
    _computeInGivenExactOut,
    _computeInvariantDown,
    _computeInvariantUp,
    _computeOutGivenExactIn,
    _MAX_INVARIANT_RATIO,
    _MIN_INVARIANT_RATIO,
    Weighted,
} from '@/weighted';
import {
    SwapKind,
    type SwapParams,
    type MaxSwapParams,
    Rounding,
    PoolBase,
    MaxSingleTokenRemoveParams,
} from '../vault/types';
import { MathSol, MAX_UINT256 } from '../utils/math';
import {
    calculateBlockNormalisedWeight,
    getFirstFourWeightsAndMultipliers,
    getSecondFourWeightsAndMultipliers,
} from './quantAmmMath';
import { QuantAmmState } from './quantAmmData';
import { toRawUndoRateRoundDown } from '@/vault/utils';

export class QuantAmm implements PoolBase {
    private weights: bigint[];
    private multipliers: bigint[];

    constructor(private quantAmmState: QuantAmmState) {
        const first = getFirstFourWeightsAndMultipliers(
            quantAmmState.tokens,
            quantAmmState.firstFourWeightsAndMultipliers,
        );
        const second = getSecondFourWeightsAndMultipliers(
            quantAmmState.tokens,
            quantAmmState.secondFourWeightsAndMultipliers,
        );

        this.weights = [...first.weights, ...second.weights];
        this.multipliers = [...first.multipliers, ...second.multipliers];
    }

    getMaximumInvariantRatio(): bigint {
        return _MAX_INVARIANT_RATIO;
    }

    getMinimumInvariantRatio(): bigint {
        return _MIN_INVARIANT_RATIO;
    }

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
            const max18 = MathSol.mulDownFixed(
                balancesLiveScaled18[indexIn],
                this.quantAmmState.maxTradeSizeRatio,
            );
            // Scale to token in (and remove rate)
            return toRawUndoRateRoundDown(
                max18,
                scalingFactors[indexIn],
                tokenRates[indexIn],
            );
        }

        const max18 = MathSol.mulDownFixed(
            balancesLiveScaled18[indexOut],
            this.quantAmmState.maxTradeSizeRatio,
        );
        // Scale to token out
        return toRawUndoRateRoundDown(
            max18,
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
            balancesLiveScaled18,
            indexIn,
            indexOut,
            amountGivenScaled18,
        } = swapParams;

        let multiplierTime = this.quantAmmState.currentTimestamp;

        if (
            this.quantAmmState.currentTimestamp >=
            this.quantAmmState.lastInteropTime
        ) {
            multiplierTime = this.quantAmmState.lastInteropTime;
        }

        const timeSinceLastUpdate =
            multiplierTime - this.quantAmmState.lastUpdateTime;

        // Get current weights based on time interpolation
        const { tokenInWeight, tokenOutWeight } = this._getNormalizedWeightPair(
            indexIn,
            indexOut,
            timeSinceLastUpdate,
            this.weights,
            this.multipliers,
        );

        if (swapKind === SwapKind.GivenIn) {
            // Check max trade size ratio
            if (
                amountGivenScaled18 >
                MathSol.mulDownFixed(
                    balancesLiveScaled18[indexIn],
                    this.quantAmmState.maxTradeSizeRatio,
                )
            ) {
                throw new Error('MaxTradeSizeRatio exceeded');
            }

            const amountOutScaled18 = _computeOutGivenExactIn(
                balancesLiveScaled18[indexIn],
                tokenInWeight,
                balancesLiveScaled18[indexOut],
                tokenOutWeight,
                amountGivenScaled18,
            );

            // Check max trade size ratio for output
            if (
                amountOutScaled18 >
                MathSol.mulDownFixed(
                    balancesLiveScaled18[indexOut],
                    this.quantAmmState.maxTradeSizeRatio,
                )
            ) {
                throw new Error('MaxTradeSizeRatio exceeded');
            }

            return amountOutScaled18;
        } else {
            // Swap Given Out

            // Check max trade size ratio for output
            if (
                amountGivenScaled18 >
                MathSol.mulDownFixed(
                    balancesLiveScaled18[indexOut],
                    this.quantAmmState.maxTradeSizeRatio,
                )
            ) {
                throw new Error('MaxTradeSizeRatio exceeded');
            }

            const amountInScaled18 = _computeInGivenExactOut(
                balancesLiveScaled18[indexIn],
                tokenInWeight,
                balancesLiveScaled18[indexOut],
                tokenOutWeight,
                amountGivenScaled18,
            );

            // Check max trade size ratio for input
            if (
                amountInScaled18 >
                MathSol.mulDownFixed(
                    balancesLiveScaled18[indexIn],
                    this.quantAmmState.maxTradeSizeRatio,
                )
            ) {
                throw new Error('MaxTradeSizeRatio exceeded');
            }

            return amountInScaled18;
        }
    }

    computeInvariant(
        balancesLiveScaled18: bigint[],
        rounding: Rounding,
    ): bigint {
        let multiplierTime = this.quantAmmState.currentTimestamp;

        if (
            this.quantAmmState.currentTimestamp >=
            this.quantAmmState.lastInteropTime
        ) {
            multiplierTime = this.quantAmmState.lastInteropTime;
        }

        const timeSinceLastUpdate =
            multiplierTime - this.quantAmmState.lastUpdateTime;

        const normalizedWeights = this._getNormalizedWeights(
            timeSinceLastUpdate,
            this.weights,
            this.multipliers,
        );
        if (rounding === Rounding.ROUND_UP) {
            return _computeInvariantUp(normalizedWeights, balancesLiveScaled18);
        }
        return _computeInvariantDown(normalizedWeights, balancesLiveScaled18);
    }

    computeBalance(
        balancesLiveScaled18: bigint[],
        tokenInIndex: number,
        invariantRatio: bigint,
    ): bigint {
        let multiplierTime = this.quantAmmState.currentTimestamp;

        if (
            this.quantAmmState.currentTimestamp >=
            this.quantAmmState.lastInteropTime
        ) {
            multiplierTime = this.quantAmmState.lastInteropTime;
        }

        const timeSinceLastUpdate =
            multiplierTime - this.quantAmmState.lastUpdateTime;

        const normalizedWeights = this._getNormalizedWeights(
            timeSinceLastUpdate,
            this.weights,
            this.multipliers,
        );
        return _computeBalanceOutGivenInvariant(
            balancesLiveScaled18[tokenInIndex],
            normalizedWeights[tokenInIndex],
            invariantRatio,
        );
    }

    private _getNormalizedWeightPair(
        indexIn: number,
        indexOut: number,
        timeSinceLastUpdate: bigint,
        weights: bigint[],
        multipliers: bigint[],
    ): { tokenInWeight: bigint; tokenOutWeight: bigint } {
        // Calculate weights based on time interpolation
        const tokenInWeight = calculateBlockNormalisedWeight(
            weights[indexIn],
            multipliers[indexIn],
            timeSinceLastUpdate,
        );

        const tokenOutWeight = calculateBlockNormalisedWeight(
            weights[indexOut],
            multipliers[indexOut],
            timeSinceLastUpdate,
        );

        return { tokenInWeight, tokenOutWeight };
    }

    private _getNormalizedWeights(
        timeSinceLastUpdate: bigint,
        weights: bigint[],
        multipliers: bigint[],
    ): bigint[] {
        const normalizedWeights = new Array(weights.length).fill(0n);

        for (let i = 0; i < weights.length; i++) {
            normalizedWeights[i] = calculateBlockNormalisedWeight(
                weights[i],
                multipliers[i],
                timeSinceLastUpdate,
            );
        }

        return normalizedWeights;
    }
}

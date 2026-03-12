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
import { MAX_UINT256 } from '../constants';

import type { FixedPriceLBPState } from './data';

export class FixedPriceLBP implements PoolBase {
    projectTokenIndex: number;
    reserveTokenIndex: number;
    projectTokenRate: bigint;
    isSwapEnabled: boolean;

    constructor(poolState: FixedPriceLBPState) {
        this.projectTokenIndex = poolState.projectTokenIndex;
        this.reserveTokenIndex = poolState.reserveTokenIndex;
        this.projectTokenRate = poolState.projectTokenRate;
        this.isSwapEnabled = poolState.isSwapEnabled;
    }

    getMaximumInvariantRatio(): bigint {
        return MAX_UINT256;
    }

    getMinimumInvariantRatio(): bigint {
        return 0n;
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
            // GivenIn: user specifies reserve amount in.
            // Max input is limited by output (project) token balance.
            // maxIn (scaled18) = projectBalance * projectTokenRate
            const maxIn18 = MathSol.mulDownFixed(
                balancesLiveScaled18[indexOut],
                this.projectTokenRate,
            );
            // Convert to raw using input token's scaling/rate
            return toRawUndoRateRoundDown(
                maxIn18,
                scalingFactors[indexIn],
                tokenRates[indexIn],
            );
        }

        // GivenOut: user specifies project amount out.
        // Max output is the project token balance.
        const maxOut18 = balancesLiveScaled18[indexOut];
        return toRawUndoRateRoundDown(
            maxOut18,
            scalingFactors[indexOut],
            tokenRates[indexOut],
        );
    }

    getMaxSingleTokenAddAmount(): bigint {
        throw new Error('UnsupportedOperation');
    }

    getMaxSingleTokenRemoveAmount(
        _maxRemoveParams: MaxSingleTokenRemoveParams,
    ): bigint {
        throw new Error('UnsupportedOperation');
    }

    onSwap(swapParams: SwapParams): bigint {
        if (!this.isSwapEnabled) {
            throw new Error('SwapsDisabled');
        }

        if (swapParams.indexIn === this.projectTokenIndex) {
            throw new Error('SwapOfProjectTokenIn');
        }

        if (swapParams.swapKind === SwapKind.GivenIn) {
            // Reserve tokens in, project tokens out: amountOut = amountIn / rate
            return MathSol.divDownFixed(
                swapParams.amountGivenScaled18,
                this.projectTokenRate,
            );
        }

        // ExactOut: amountIn = amountOut * rate
        return MathSol.mulUpFixed(
            swapParams.amountGivenScaled18,
            this.projectTokenRate,
        );
    }

    computeInvariant(
        balancesLiveScaled18: bigint[],
        rounding: Rounding,
    ): bigint {
        // inv = projectBalance * rate + reserveBalance
        const projectTokenValue =
            rounding === Rounding.ROUND_UP
                ? MathSol.mulUpFixed(
                      balancesLiveScaled18[this.projectTokenIndex],
                      this.projectTokenRate,
                  )
                : MathSol.mulDownFixed(
                      balancesLiveScaled18[this.projectTokenIndex],
                      this.projectTokenRate,
                  );

        return (
            projectTokenValue +
            balancesLiveScaled18[this.reserveTokenIndex]
        );
    }

    computeBalance(
        _balancesLiveScaled18: bigint[],
        _tokenInIndex: number,
        _invariantRatio: bigint,
    ): bigint {
        throw new Error('UnsupportedOperation');
    }
}

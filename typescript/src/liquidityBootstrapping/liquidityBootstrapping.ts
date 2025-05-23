import { SwapParams } from '@/vault/types';
import { Weighted } from '../weighted/weightedPool';

import type { LiquidityBootstrappingState } from './data';

import { getNormalizedWeights } from './liquidityBootstrappingMath';

export class LiquidityBootstrapping extends Weighted {
    lbpState: LiquidityBootstrappingState;

    constructor(poolState: LiquidityBootstrappingState) {
        const projectTokenStartWeight =
            poolState.startWeights[poolState.projectTokenIndex];
        const projectTokenEndWeight =
            poolState.endWeights[poolState.projectTokenIndex];

        const currentTime = poolState.currentTimestamp;

        // calculate weights from the pool state
        const weights = getNormalizedWeights(
            poolState.projectTokenIndex,
            currentTime,
            poolState.startTime,
            poolState.endTime,
            projectTokenStartWeight,
            projectTokenEndWeight,
        );

        // weighted pool only requires weights
        super({ weights });

        this.lbpState = poolState;
    }

    onSwap(swapParams: SwapParams): bigint {
        // swap is enabled during the weight change only
        if (!this.lbpState.isSwapEnabled) {
            throw new Error('Swap is not enabled');
        }

        // a custom setting set during pool deployment
        if (
            this.lbpState.isProjectTokenSwapInBlocked &&
            swapParams.indexIn === this.lbpState.projectTokenIndex
        ) {
            // regardless of the swap kind, the indexIn is the token going into the pool (being sold)
            throw new Error('Project token swap in is blocked');
        }

        // process the swap request
        return super.onSwap(swapParams);
    }
}

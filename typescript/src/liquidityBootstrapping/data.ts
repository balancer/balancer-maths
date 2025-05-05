import { BasePoolState } from '@/vault/types';
import { WeightedImmutable } from '@/weighted/data';

type PoolType = 'LIQUIDITY_BOOTSTRAPPING';

export type LiquidityBootstrappingState = BasePoolState & {
    poolType: PoolType;
    currentTimestamp: bigint;
} & LiquidityBootstrappingImmutable &
    LiquidityBootstrappingMutable;

export type LiquidityBootstrappingImmutable = {
    projectTokenIndex: number;
    isProjectTokenSwapInBlocked: boolean;
    startWeights: bigint[];
    endWeights: bigint[];
    startTime: bigint;
    endTime: bigint;
};

export type LiquidityBootstrappingMutable = {
    isSwapEnabled: boolean;
} & WeightedImmutable;

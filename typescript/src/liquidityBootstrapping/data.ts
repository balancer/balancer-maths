import { BasePoolState } from '@/vault/types';
import { WeightedImmutable } from '@/weighted/data';

type PoolType = 'LIQUIDITY_BOOTSTRAPPING';

export type LiquidityBootstrappingState = BasePoolState & {
    poolType: PoolType;
} & LiquidityBootstrappingImmutable &
    LiquidityBootstrappingMutable;

export type LiquidityBootstrappingImmutable = {
    projectTokenIndex: number;
    reserveTokenIndex: number;
    isProjectTokenSwapInBlocked: boolean;
};

export type LiquidityBootstrappingMutable = {
    isSwapEnabled: boolean;
} & WeightedImmutable;

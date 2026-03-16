import { BasePoolState } from '@/vault/types';

type PoolType = 'FIXED_PRICE_LBP';

export type FixedPriceLBPImmutable = {
    projectTokenIndex: number;
    reserveTokenIndex: number;
    projectTokenRate: bigint;
    startTime: bigint;
    endTime: bigint;
};

export type FixedPriceLBPMutable = {
    isSwapEnabled: boolean;
    currentTimestamp: bigint;
};

export type FixedPriceLBPState = BasePoolState & {
    poolType: PoolType;
} & FixedPriceLBPImmutable &
    FixedPriceLBPMutable;

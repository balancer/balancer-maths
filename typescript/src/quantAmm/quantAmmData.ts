import { BasePoolState } from '@/vault/types';

type PoolType = 'QUANT_AMM_WEIGHTED';

export type QuantAmmMutable = {
    firstFourWeightsAndMultipliers: bigint[];
    secondFourWeightsAndMultipliers: bigint[];
    lastUpdateTime: bigint;
    lastInteropTime: bigint;
    currentTimestamp: bigint;
};

export type QuantAmmImmutable = {
    maxTradeSizeRatio: bigint;
};

export type QuantAmmState = BasePoolState & {
    poolType: PoolType;
} & QuantAmmMutable &
    QuantAmmImmutable;

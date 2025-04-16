import { BasePoolState } from '@/vault/types';

type PoolType = 'RECLAMM';
export type ReClammImmutable = {
    initialMinPrice: bigint;
    initialMaxPrice: bigint;
    initialTargetPrice: bigint;
    initialPriceShiftDailyRate: bigint;
    initialCenterednessMargin: bigint;
    minCenterednessMargin: bigint;
    maxCenterednessMargin: bigint;
    minTokenBalanceScaled18: bigint;
    minPoolCenteredness: bigint;
    maxPriceShiftDailyRate: bigint;
    minPriceRatioUpdateDuration: bigint;
    minFourthRootPriceRatioDelta: bigint;
};

export type ReClammState = BasePoolState & {
    poolType: PoolType;
} & ReClammImmutable;

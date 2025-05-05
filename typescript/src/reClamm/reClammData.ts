import { BasePoolState } from '@/vault/types';

type PoolType = 'RECLAMM';
export type ReClammMutable = {
    lastVirtualBalances: bigint[];
    dailyPriceShiftBase: bigint;
    lastTimestamp: bigint;
    currentTimestamp: bigint;
    centerednessMargin: bigint;
    startFourthRootPriceRatio: bigint;
    endFourthRootPriceRatio: bigint;
    priceRatioUpdateStartTime: bigint;
    priceRatioUpdateEndTime: bigint;
};

export type ReClammState = BasePoolState & {
    poolType: PoolType;
} & ReClammMutable;

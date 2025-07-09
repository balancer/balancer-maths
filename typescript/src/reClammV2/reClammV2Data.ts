import { BasePoolState } from '@/vault/types';

type PoolType = 'RECLAMM_V2';
export type ReClammV2Mutable = {
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

export type ReClammV2State = BasePoolState & {
    poolType: PoolType;
} & ReClammV2Mutable;

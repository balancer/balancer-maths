import { BasePoolState } from '@/vault/types';

type PoolType = 'WEIGHTED';
export type WeightedImmutable = {
    weights: bigint[];
};

export type WeightedState = BasePoolState & {
    poolType: PoolType;
} & WeightedImmutable;

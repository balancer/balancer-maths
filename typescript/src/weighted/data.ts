import { PoolState } from '@/vault/types';

type PoolType = 'Weighted';
export type WeightedImmutable = {
    weights: bigint[];
};

export type WeightedState = PoolState & {
    poolType: PoolType;
} & WeightedImmutable;

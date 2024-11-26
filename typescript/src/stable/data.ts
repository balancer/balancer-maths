import { BasePoolState } from '@/vault/types';

type PoolType = 'STABLE';

export type StableMutable = {
    amp: bigint;
};

export type StableState = BasePoolState & {
    poolType: PoolType;
} & StableMutable;

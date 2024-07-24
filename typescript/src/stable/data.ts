import { PoolState } from '@/vault/types';

type PoolType = 'Stable';

export type StableMutable = {
    amp: bigint;
};

export type StableState = PoolState & { poolType: PoolType } & StableMutable;

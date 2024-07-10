type PoolType = 'Buffer';

export type BufferMutable = {
    rate: bigint;
};

export type BufferImmutable = {
    poolAddress: string;
    tokens: string[];
};

export type BufferState = { poolType: PoolType } & BufferImmutable &
    BufferMutable;

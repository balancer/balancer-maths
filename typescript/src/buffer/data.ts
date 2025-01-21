type PoolType = 'Buffer';

export type BufferMutable = {
    rate: bigint;
};

export type BufferImmutable = {
    poolAddress: string;
    tokens: string[];
    scalingFactor: bigint; // between wrapped/underlying
};

/**
 * State of a buffer. Note - rate uses scaled 18.
 */
export type BufferState = { poolType: PoolType } & BufferImmutable &
    BufferMutable;

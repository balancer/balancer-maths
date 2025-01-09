import { BasePoolState } from '@/vault/types';

type PoolType = 'GYRO';
export type Gyro2CLPImmutable = {
    sqrtAlpha: bigint;
    sqrtBeta: bigint;
};

export type Gyro2CLPState = BasePoolState & {
    poolType: PoolType;
} & Gyro2CLPImmutable;

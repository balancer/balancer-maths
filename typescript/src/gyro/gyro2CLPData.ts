import { BasePoolState } from '@/vault/types';

type PoolType = 'GYRO2CLP';
export type Gyro2CLPImmutable = {
    sqrtAlpha: bigint;
    sqrtBeta: bigint;
};

export type Gyro2CLPState = BasePoolState & {
    poolType: PoolType;
} & Gyro2CLPImmutable;

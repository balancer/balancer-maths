import { BasePoolState } from '@/vault/types';

type PoolType = 'GYROE';
export type GyroECLPImmutable = {
    paramsAlpha: bigint;
    paramsBeta: bigint;
    paramsC: bigint;
    paramsS: bigint;
    paramsLambda: bigint;
    tauAlphaX: bigint;
    tauAlphaY: bigint;
    tauBetaX: bigint;
    tauBetaY: bigint;
    u: bigint;
    v: bigint;
    w: bigint;
    z: bigint;
    dSq: bigint;
};

export type GyroECLPState = BasePoolState & {
    poolType: PoolType;
} & GyroECLPImmutable;

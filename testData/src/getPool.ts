import type { Address } from 'viem';
import { WeightedPool } from './weightedPool';
import { StablePool } from './stablePool';
import type { PoolBase } from './types';
import { BufferPool } from './buffer';
import { GyroECLPPool } from './gyroECLP';
import { ReClammPool } from './reClamm';

export async function getPool(
    rpcUrl: string,
    chainId: number,
    blockNumber: bigint,
    poolType: string,
    poolAddress: Address,
): Promise<PoolBase> {
    // Find onchain data fetching via pool type
    const poolData: Record<
        string,
        WeightedPool | StablePool | BufferPool | GyroECLPPool | ReClammPool
    > = {
        WEIGHTED: new WeightedPool(rpcUrl, chainId),
        STABLE: new StablePool(rpcUrl, chainId),
        Buffer: new BufferPool(rpcUrl, chainId),
        GYROE: new GyroECLPPool(rpcUrl, chainId),
        RECLAMM: new ReClammPool(rpcUrl, chainId),
    };
    if (!poolData[poolType])
        throw new Error(`getPool: Unsupported pool type: ${poolType}`);

    console.log('Fetching pool data...');
    const immutable = await poolData[poolType].fetchImmutableData(
        poolAddress,
        blockNumber,
    );
    const mutable = await poolData[poolType].fetchMutableData(
        poolAddress,
        blockNumber,
    );
    console.log('Done');

    return {
        chainId,
        blockNumber,
        poolType,
        poolAddress,
        ...immutable,
        ...mutable,
    };
}

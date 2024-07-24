import type { Address } from 'viem';
import { WeightedPool } from './weightedPool';
import { StablePool } from './stablePool';
import type { PoolBase } from './types';

export async function getPool(
    rpcUrl: string,
    chainId: number,
    blockNumber: number,
    poolType: string,
    poolAddress: Address,
): Promise<PoolBase> {
    // Find onchain data fetching via pool type
    const poolData = {
        Weighted: new WeightedPool(rpcUrl, chainId),
        Stable: new StablePool(rpcUrl, chainId),
    };
    if (!poolData[poolType]) throw new Error('getPool: Unsupported pool type');

    console.log('Fetching pool data...');
    const immutable = await poolData[poolType].fetchImmutableData(poolAddress);
    const mutable = await poolData[poolType].fetchMutableData(poolAddress);
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

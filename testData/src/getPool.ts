import type { Address } from 'viem';
import { WeightedPool } from './weightedPool';
import { StablePool } from './stablePool';
import type { PoolBase, HookData } from './types';
import { BufferPool } from './buffer';
import { GyroECLPPool } from './gyroECLP';
import { ReClammPool } from './reClamm';
import { LiquidityBootstrappingPool } from './liquidityBootstrappingPool';
import { QuantAmmPool } from './quantAmm';
import { fetchHookData } from './hooks/fetchHookData';

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
        | WeightedPool
        | StablePool
        | BufferPool
        | GyroECLPPool
        | ReClammPool
        | LiquidityBootstrappingPool
        | QuantAmmPool
    > = {
        WEIGHTED: new WeightedPool(rpcUrl, chainId),
        STABLE: new StablePool(rpcUrl, chainId),
        Buffer: new BufferPool(rpcUrl, chainId),
        GYROE: new GyroECLPPool(rpcUrl, chainId),
        LIQUIDITY_BOOTSTRAPPING: new LiquidityBootstrappingPool(
            rpcUrl,
            chainId,
        ),
        RECLAMM: new ReClammPool(rpcUrl, chainId),
        RECLAMM_V2: new ReClammPool(rpcUrl, chainId),
        QUANT_AMM_WEIGHTED: new QuantAmmPool(rpcUrl, chainId),
    };
    if (!poolData[poolType])
        throw new Error(`getPool: Unsupported pool type: ${poolType}`);

    console.log('Fetching pool data...');
    const immutable = await poolData[poolType].fetchImmutableData(
        poolAddress,
        blockNumber,
    );
    const mutable =
        poolType === 'Buffer'
            ? await (poolData[poolType] as BufferPool).fetchMutableData(
                  poolAddress,
                  blockNumber,
                  BigInt(immutable.scalingFactor),
              )
            : await poolData[poolType].fetchMutableData(
                  poolAddress,
                  blockNumber,
              );
    console.log('Done');

    // Fetch hook data for all pools except Buffer pools (which don't support hooks)
    let hook: HookData | undefined;
    if (poolType !== 'Buffer') {
        console.log('Fetching hook data...');
        hook = await fetchHookData(rpcUrl, chainId, poolAddress, blockNumber);
        console.log('Done');
    }

    return {
        chainId,
        blockNumber,
        poolType,
        poolAddress,
        ...immutable,
        ...mutable,
        ...(hook && { hook }), // Only include if hook exists
    };
}

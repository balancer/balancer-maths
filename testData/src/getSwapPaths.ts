import type { Address } from 'viem';
import {
    SwapKind,
    Swap,
    type SwapInput as SdkSwapInput,
    type ExactInQueryOutput,
    type ExactOutQueryOutput,
} from '@balancer/sdk';
import { PoolBase } from './types';
import { getPool } from './getPool';

export type SwapPathInput = {
    swapKind: SwapKind;
    pools: {
        poolAddress: Address;
        poolType: string;
    }[];
    tokens: Address[];
    amountRaw: bigint;
};

export type SwapPathResult = Omit<SwapPathInput, 'amountRaw' | 'pools'> & {
    pools: PoolBase[];
    amountRaw: string;
    outputRaw: string;
};

async function querySwapPaths(
    chainId: number,
    rpcUrl: string,
    swapPathInput: SwapPathInput,
    blockNumber: bigint,
): Promise<bigint> {
    const swapInput: SdkSwapInput = {
        chainId: chainId,
        swapKind: swapPathInput.swapKind,
        paths: [
            {
                pools: swapPathInput.pools.map((pool) => pool.poolAddress),
                tokens: swapPathInput.tokens.map((token) => ({
                    address: token,
                    decimals: 18, // does not need decimals because uses raw amounts everywhere
                })),
                isBuffer: swapPathInput.pools.map(
                    (pool) => pool.poolType === 'Buffer',
                ),
                protocolVersion: 3,
                inputAmountRaw:
                    swapPathInput.swapKind === SwapKind.GivenIn
                        ? BigInt(swapPathInput.amountRaw)
                        : 0n,
                outputAmountRaw:
                    swapPathInput.swapKind === SwapKind.GivenOut
                        ? BigInt(swapPathInput.amountRaw)
                        : 0n,
            },
        ],
    };
    const sdkSwap = new Swap(swapInput);
    let result = 0n;
    if (swapPathInput.swapKind === SwapKind.GivenIn) {
        const queryResult = (await sdkSwap.query(
            rpcUrl,
            blockNumber,
        )) as ExactInQueryOutput;
        result = queryResult.expectedAmountOut.amount;
    } else {
        const queryResult = (await sdkSwap.query(
            rpcUrl,
            blockNumber,
        )) as ExactOutQueryOutput;
        result = queryResult.expectedAmountIn.amount;
    }
    return result;
}

export async function getSwapPaths(
    swapPathInputs: SwapPathInput[],
    rpcUrl: string,
    chainId: number,
    blockNumber: bigint,
): Promise<SwapPathResult[] | undefined> {
    if (!swapPathInputs) return undefined;
    const results: SwapPathResult[] = [];
    console.log('Querying swaps...');
    for (const swapPathInput of swapPathInputs) {
        // get swap. TODO - put this in a multicall?
        const result = await querySwapPaths(
            chainId,
            rpcUrl,
            swapPathInput,
            blockNumber,
        );

        const pools = await Promise.all(
            swapPathInput.pools.map((pool) =>
                getPool(
                    rpcUrl,
                    chainId,
                    blockNumber,
                    pool.poolType,
                    pool.poolAddress,
                ),
            ),
        );

        results.push({
            ...swapPathInput,
            pools,
            amountRaw: swapPathInput.amountRaw.toString(),
            outputRaw: result.toString(),
        });
    }
    console.log('Done');
    return results;
}

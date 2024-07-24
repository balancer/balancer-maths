import type { Address } from 'viem';
import {
    SwapKind,
    Swap,
    type SwapInput as SdkSwapInput,
    type ExactInQueryOutput,
    type ExactOutQueryOutput,
} from '@balancer/sdk';

export type SwapInput = {
    swapKind: SwapKind;
    amountRaw: bigint;
    tokenIn: Address;
    tokenOut: Address;
};

export type SwapResult = Omit<SwapInput, 'amountRaw'> & {
    amountRaw: string;
    outputRaw: string;
};

async function querySwap(
    chainId: number,
    poolAddress: Address,
    rpcUrl: string,
    swap: SwapInput,
): Promise<bigint> {
    const swapInput: SdkSwapInput = {
        chainId: chainId,
        swapKind: swap.swapKind,
        paths: [
            {
                pools: [poolAddress],
                tokens: [
                    {
                        address: swap.tokenIn,
                        decimals: 18,
                    }, // tokenIn
                    {
                        address: swap.tokenOut,
                        decimals: 18,
                    }, // tokenOut
                ],
                vaultVersion: 3 as const,
                inputAmountRaw:
                    swap.swapKind === SwapKind.GivenIn
                        ? BigInt(swap.amountRaw)
                        : 0n,
                outputAmountRaw:
                    swap.swapKind === SwapKind.GivenOut
                        ? BigInt(swap.amountRaw)
                        : 0n,
            },
        ],
    };
    const sdkSwap = new Swap(swapInput);
    let result = 0n;
    if (swap.swapKind === SwapKind.GivenIn) {
        const queryResult = (await sdkSwap.query(rpcUrl)) as ExactInQueryOutput;
        result = queryResult.expectedAmountOut.amount;
    } else {
        const queryResult = (await sdkSwap.query(
            rpcUrl,
        )) as ExactOutQueryOutput;
        result = queryResult.expectedAmountIn.amount;
    }
    return result;
}

export async function getSwaps(
    swapTestInputs: SwapInput[],
    rpcUrl: string,
    chainId: number,
    poolAddress: Address,
): Promise<SwapResult[] | undefined> {
    if (!swapTestInputs) return undefined;
    const results: SwapResult[] = [];
    console.log('Querying swaps...');
    for (const swap of swapTestInputs) {
        // get swap. TODO - put this in a multicall?
        const result = await querySwap(chainId, poolAddress, rpcUrl, swap);
        results.push({
            ...swap,
            amountRaw: swap.amountRaw.toString(),
            outputRaw: result.toString(),
        });
    }
    console.log('Done');
    return results;
}

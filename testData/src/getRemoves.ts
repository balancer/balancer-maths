import {
    RemoveLiquidityKind,
    RemoveLiquidity,
    OnChainProvider,
    type RemoveLiquidityQueryOutput,
    type RemoveLiquidityInput,
    type RemoveLiquidityProportionalInput,
    type RemoveLiquiditySingleTokenExactInInput,
    type RemoveLiquiditySingleTokenExactOutInput,
} from '@balancer/sdk';
import type { Address } from 'viem';

type RemoveTestInputProportional = {
    bpt: Address;
    kind: RemoveLiquidityKind.Proportional;
    bptInRaw: bigint;
};

type RemoveTestInputSingleTokenExactIn = {
    bpt: Address;
    token: Address;
    kind: RemoveLiquidityKind.SingleTokenExactIn;
    bptInRaw: bigint;
};

type RemoveTestInputSingleTokenExactOut = {
    token: Address;
    kind: RemoveLiquidityKind.SingleTokenExactOut;
    amountOutRaw: bigint;
    decimals: number;
};

export type RemoveTestInput =
    | RemoveTestInputProportional
    | RemoveTestInputSingleTokenExactIn
    | RemoveTestInputSingleTokenExactOut;

export type RemoveLiquidityResult = {
    kind: RemoveLiquidityKind;
    amountsOutRaw: string[];
    bptInRaw: string;
};

function getInput(
    removeTestInput: RemoveTestInput,
    chainId: number,
    rpcUrl: string,
): RemoveLiquidityInput {
    const { kind } = removeTestInput;

    if (kind === RemoveLiquidityKind.Proportional) {
        const bptIn = {
            rawAmount: removeTestInput.bptInRaw,
            decimals: 18,
            address: removeTestInput.bpt,
        };
        const removeLiquidityInput: RemoveLiquidityProportionalInput = {
            chainId,
            rpcUrl,
            bptIn,
            kind: RemoveLiquidityKind.Proportional,
        };
        return removeLiquidityInput;
        // biome-ignore lint/style/noUselessElse: <explanation>
    } else if (kind === RemoveLiquidityKind.SingleTokenExactIn) {
        const bptIn = {
            rawAmount: removeTestInput.bptInRaw,
            decimals: 18,
            address: removeTestInput.bpt,
        };
        const removeLiquidityInput: RemoveLiquiditySingleTokenExactInInput = {
            chainId,
            rpcUrl,
            tokenOut: removeTestInput.token,
            kind: RemoveLiquidityKind.SingleTokenExactIn,
            bptIn,
        };
        return removeLiquidityInput;
        // biome-ignore lint/style/noUselessElse: <explanation>
    } else if (kind === RemoveLiquidityKind.SingleTokenExactOut) {
        const amountOut = {
            rawAmount: removeTestInput.amountOutRaw,
            decimals: removeTestInput.decimals,
            address: removeTestInput.token,
        };
        const removeLiquidityInput: RemoveLiquiditySingleTokenExactOutInput = {
            chainId,
            rpcUrl,
            kind: RemoveLiquidityKind.SingleTokenExactOut,
            amountOut,
        };
        return removeLiquidityInput;
    }
    // biome-ignore lint/style/noUselessElse: <explanation>
    else throw new Error('No support for Custom AddLiquidity kinds');
}

async function queryRemoveLiquidity(
    rpcUrl: string,
    chainId: number,
    poolAddress: Address,
    poolType: string,
    removeTestInput: RemoveTestInput,
): Promise<RemoveLiquidityQueryOutput> {
    const removeLiquidityInput = getInput(removeTestInput, chainId, rpcUrl);
    // Onchain provider is used to fetch pool state
    const onchainProvider = new OnChainProvider(rpcUrl, chainId);
    const poolState = await onchainProvider.pools.fetchPoolState(
        poolAddress,
        poolType,
    );
    // Simulate addLiquidity to get the amount of BPT out
    const removeLiquidity = new RemoveLiquidity();
    return await removeLiquidity.query(removeLiquidityInput, poolState);
}

export async function getRemoveLiquiditys(
    removeTestInputs: RemoveTestInput[],
    rpcUrl: string,
    chainId: number,
    poolAddress: Address,
    poolType: string,
): Promise<RemoveLiquidityResult[] | undefined> {
    if (!removeTestInputs) return undefined;
    const results: RemoveLiquidityResult[] = [];
    console.log('Querying removes...');
    for (const removeTestInput of removeTestInputs) {
        // TODO - put this in a multicall?
        const result = await queryRemoveLiquidity(
            rpcUrl,
            chainId,
            poolAddress,
            poolType,
            removeTestInput,
        );
        results.push({
            kind: removeTestInput.kind,
            amountsOutRaw: result.amountsOut.map((a) => a.amount.toString()),
            bptInRaw: result.bptIn.amount.toString(),
        });
    }
    console.log('Done');
    return results;
}

import {
	SwapKind,
	Swap,
	type SwapInput as SdkSwapInput,
	type ExactInQueryOutput,
	type ExactOutQueryOutput,
} from "@balancer/sdk";
import type { TestInput, SwapInput, SwapResult } from "./types";

async function querySwap(
	testInput: TestInput,
	swap: SwapInput,
): Promise<bigint> {
	const swapInput: SdkSwapInput = {
		chainId: testInput.chainId,
		swapKind: swap.swapKind,
		paths: [
			{
				pools: [testInput.poolAddress],
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
					swap.swapKind === SwapKind.GivenIn ? BigInt(swap.amountRaw) : 0n,
				outputAmountRaw:
					swap.swapKind === SwapKind.GivenOut ? BigInt(swap.amountRaw) : 0n,
			},
		],
	};
	const sdkSwap = new Swap(swapInput);
	let result = 0n;
	if (swap.swapKind === SwapKind.GivenIn) {
		const queryResult = (await sdkSwap.query(
			testInput.rpcUrl,
		)) as ExactInQueryOutput;
		result = queryResult.expectedAmountOut.amount;
	} else {
		const queryResult = (await sdkSwap.query(
			testInput.rpcUrl,
		)) as ExactOutQueryOutput;
		result = queryResult.expectedAmountIn.amount;
	}
	return result;
}

export async function getSwaps(testInput: TestInput): Promise<SwapResult[]> {
	const results: SwapResult[] = [];
	console.log("Querying swaps...");
	for (const swap of testInput.swaps) {
		// get swap. TODO - put this in a multicall?
		const result = await querySwap(testInput, swap);
		results.push({
			...swap,
			amountRaw: swap.amountRaw.toString(),
			outputRaw: result.toString(),
		});
	}
	console.log("Done");
	return results;
}

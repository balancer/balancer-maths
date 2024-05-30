import {
	AddLiquidityKind,
	type AddLiquidityInput,
	AddLiquidity,
	OnChainProvider,
	type AddLiquidityQueryOutput,
} from "@balancer/sdk";
import type { Address } from "viem";

type AddTestInputProportional = {
	kind: AddLiquidityKind.Proportional;
	inputAmountsRaw: bigint[];
	tokens: Address[];
	decimals: number[];
};

type AddTestInputSingleToken = {
	kind: AddLiquidityKind.SingleToken;
	bptOutRaw: bigint;
	tokenIn: Address;
	decimals: number;
};

export type AddTestInput = AddTestInputProportional | AddTestInputSingleToken;

export type AddLiquidityResult = {
	kind: AddLiquidityKind;
	inputAmountsRaw: string[];
	bptOutRaw: string;
};

function getInput(
	addTestInput: AddTestInput,
	chainId: number,
	rpcUrl: string,
): AddLiquidityInput {
	const { kind } = addTestInput;
	if (kind === AddLiquidityKind.Proportional) {
		const amounts = addTestInput.inputAmountsRaw.map((a, i) => ({
			rawAmount: a,
			decimals: addTestInput.decimals[i],
			address: addTestInput.tokens[i],
		}));
		const addLiquidityInput: AddLiquidityInput = {
			amountsIn: amounts,
			chainId,
			rpcUrl,
			kind: AddLiquidityKind.Unbalanced,
		};
		return addLiquidityInput;
		// biome-ignore lint/style/noUselessElse: <explanation>
	} else if (kind === AddLiquidityKind.SingleToken) {
		const bptAmount = {
			rawAmount: addTestInput.bptOutRaw,
			decimals: addTestInput.decimals,
			address: addTestInput.tokenIn,
		};
		const addLiquidityInput: AddLiquidityInput = {
			bptOut: bptAmount,
			tokenIn: addTestInput.tokenIn,
			chainId,
			rpcUrl,
			kind: AddLiquidityKind.SingleToken,
		};
		return addLiquidityInput;
		// biome-ignore lint/style/noUselessElse: <explanation>
	} else throw new Error("No support for Custom AddLiquidity kinds");
}

async function queryAddLiquidity(
	rpcUrl: string,
	chainId: number,
	poolAddress: Address,
	poolType: string,
	addTestInput: AddTestInput,
): Promise<AddLiquidityQueryOutput> {
	const addLiquidityInput = getInput(addTestInput, chainId, rpcUrl);
	// Onchain provider is used to fetch pool state
	const onchainProvider = new OnChainProvider(rpcUrl, chainId);
	const poolState = await onchainProvider.pools.fetchPoolState(
		poolAddress,
		poolType,
	);
	// Simulate addLiquidity to get the amount of BPT out
	const addLiquidity = new AddLiquidity();
	return await addLiquidity.query(addLiquidityInput, poolState);
}

export async function getAddLiquiditys(
	addTestInputs: AddTestInput[],
	rpcUrl: string,
	chainId: number,
	poolAddress: Address,
	poolType: string,
): Promise<AddLiquidityResult[] | undefined> {
	if (!addTestInputs) return undefined;
	const results: AddLiquidityResult[] = [];
	console.log("Querying adds...");
	for (const addTestInput of addTestInputs) {
		// TODO - put this in a multicall?
		const result = await queryAddLiquidity(
			rpcUrl,
			chainId,
			poolAddress,
			poolType,
			addTestInput,
		);
		results.push({
			kind: addTestInput.kind,
			inputAmountsRaw: result.amountsIn.map((a) => a.amount.toString()),
			bptOutRaw: result.bptOut.amount.toString(),
		});
	}
	console.log("Done");
	return results;
}

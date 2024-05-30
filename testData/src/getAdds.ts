import {
	AddLiquidityKind,
	type AddLiquidityInput,
	AddLiquidity,
	OnChainProvider,
	type AddLiquidityQueryOutput,
} from "@balancer/sdk";
import type { Address } from "viem";

export type AddTestInput = {
	kind: AddLiquidityKind;
	inputAmountsRaw: bigint[];
	tokens: Address[];
	decimals: number[];
};

export type AddLiquidityResult = Omit<AddTestInput, "inputAmountsRaw"> & {
	inputAmountsRaw: string[];
	bptOutRaw: string;
};

function getInput(
	kind: AddLiquidityKind,
	inputAmountsRaw: bigint[],
	tokens: Address[],
	decimals: number[],
	chainId: number,
	rpcUrl: string,
): AddLiquidityInput {
	if (kind === AddLiquidityKind.Proportional) {
		const amounts = inputAmountsRaw.map((a, i) => ({
			rawAmount: a,
			decimals: decimals[i],
			address: tokens[i],
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
		const amounts = inputAmountsRaw.map((a, i) => ({
			rawAmount: a,
			decimals: decimals[i],
			address: tokens[i],
		}));
		const addLiquidityInput: AddLiquidityInput = {
			bptOut: amounts[0],
			tokenIn: tokens[0],
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
	const addLiquidityInput = getInput(
		addTestInput.kind,
		addTestInput.inputAmountsRaw,
		addTestInput.tokens,
		addTestInput.decimals,
		chainId,
		rpcUrl,
	);
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
			...addTestInput,
			tokens: result.amountsIn.map(a => a.token.address),
			inputAmountsRaw: result.amountsIn.map((a) => a.amount.toString()),
			bptOutRaw: result.bptOut.amount.toString(),
		});
	}
	console.log("Done");
	return results;
}

function isSameAddress(addressOne: string, addressTwo: string) {
	return addressOne.toLowerCase() === addressTwo.toLowerCase();
}

import type { Address } from "viem";
import type { SwapKind } from "@balancer/sdk";

export type SwapInput = {
	swapKind: SwapKind;
	amount: bigint;
	tokenIn: Address;
	tokenOut: Address;
};

export type SwapResult = Omit<SwapInput, "amount"> & {
	amount: string;
	output: string;
};

export type Pool = {
	chainId: number;
	blockNumber: number;
	poolType: string;
	address: Address;
};

export type TestData = {
	pool: Pool;
	swaps: SwapResult[];
};

export type TestInput = {
	rpcUrl: string;
	testName: string;
	chainId: number;
	blockNumber: number;
	poolAddress: Address;
	poolType: string;
	swaps: SwapInput[];
};

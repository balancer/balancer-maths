import type { Address } from "viem";
import type { SwapKind } from "@balancer/sdk";

export type SwapInput = {
	swapKind: SwapKind;
	amountRaw: bigint;
	tokenIn: Address;
	tokenOut: Address;
};

export type SwapResult = Omit<SwapInput, "amountRaw"> & {
	amountRaw: string;
	outputRaw: string;
};

export type PoolBase = {
	chainId: number;
	blockNumber: number;
	poolType: string;
	address: Address;
};

export type TestData = {
	pool: PoolBase;
	swaps: SwapResult[];
};

export type TestInput = SwapConfig & {
	rpcUrl: string;
};

export type SwapConfig = {
	testName: string;
	chainId: number;
	blockNumber: number;
	poolAddress: Address;
	poolType: string;
	swaps: SwapInput[];
};

export type Config = {
	swaps: SwapConfig[];
}
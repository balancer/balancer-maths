import type { Address } from "viem";
import type { AddLiquidityResult, AddTestInput } from "./getAdds";
import type { SwapResult, SwapInput } from "./getSwaps";

export type PoolBase = {
	chainId: number;
	blockNumber: number;
	poolType: string;
	poolAddress: Address;
};

// Read from main test config file
export type Config = {
	poolTests: PoolTestConfig[];
};

// Each pool/chain/block has its own set of swap/add/remove tests
type PoolTestConfig = PoolBase & {
	testName: string;
	swaps: SwapInput[];
	adds: AddTestInput[];
};

export type TestInput = PoolTestConfig & {
	rpcUrl: string;
};

export type TestOutput = {
	pool: PoolBase;
	swaps: SwapResult[] | undefined;
	adds: AddLiquidityResult[] | undefined;
};

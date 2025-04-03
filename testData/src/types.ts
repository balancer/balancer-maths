import type { Address } from 'viem';
import type { AddLiquidityResult, AddTestInput } from './getAdds';
import type { SwapResult, SwapInput } from './getSwaps';
import type { RemoveLiquidityResult, RemoveTestInput } from './getRemoves';
import { SwapPathInput, SwapPathResult } from './getSwapPath';

// Read from main test config file
export type Config = {
    poolTests: PoolTestConfig[];
    swapPathTests: SwapPathTestConfig[];
};

export type TestBase = {
    chainId: number;
    blockNumber: bigint;
};

export type PoolBase = {
    poolType: string;
    poolAddress: Address;
};

// Each pool/chain/block has its own set of swap/add/remove tests
type PoolTestConfig = TestBase &
    PoolBase & {
        testName: string;
        swaps: SwapInput[];
        adds: AddTestInput[];
        removes: RemoveTestInput[];
    };

export type PoolTestInput = PoolTestConfig & {
    rpcUrl: string;
};

export type PoolTestOutput = {
    pool: PoolBase & TestBase;
    swaps: SwapResult[] | undefined;
    adds: AddLiquidityResult[] | undefined;
    removes: RemoveLiquidityResult[] | undefined;
};

type SwapPathTestConfig = TestBase & {
    testName: string;
    swapPathInput: SwapPathInput;
};

export type SwapPathTestInput = SwapPathTestConfig & {
    rpcUrl: string;
};

export type SwapPathTestOutput = {
    swapPath: SwapPathResult;
    pools: PoolBase[];
    underlyingTokens: {
        address: Address;
        decimals: number;
    }[];
    test: TestBase;
};

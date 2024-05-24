import { SwapKind } from "@balancer/sdk";
import { generateSwapTestData } from "./src/generateSwapTestData";

generateSwapTestData({
	rpcUrl: Bun.env.SEPOLIA_RPC_URL as string,
	testName: "Weighted",
	chainId: 11155111,
	blockNumber: 5955145,
	poolAddress: "0x204d4194e4e42364e3d1841d0a9b1ef857879c31",
	poolType: "Weighted",
	swaps: [
		{
			swapKind: SwapKind.GivenIn,
			amountRaw: 1000000000000000n,
			tokenIn: "0x7b79995e5f793a07bc00c21412e50ecae098e7f9",
			tokenOut: "0xb19382073c7a0addbb56ac6af1808fa49e377b75",
		},
		{
			swapKind: SwapKind.GivenOut,
			amountRaw: 2000000000000000n,
			tokenIn: "0x7b79995e5f793a07bc00c21412e50ecae098e7f9",
			tokenOut: "0xb19382073c7a0addbb56ac6af1808fa49e377b75",
		},
	],
});

// generateSwapTestData({
// 	rpcUrl: Bun.env.SEPOLIA_RPC_URL as string,
// 	testName: "MockStableTest",
// 	chainId: 11155111,
// 	blockNumber: 5955145,
// 	poolAddress: "0xe623a14c663e66f63ceddd73528da84db4e41350",
// 	poolType: "Stable",
// 	swaps: [
// 		{
// 			swapKind: SwapKind.GivenIn,
// 			amount: 1000n,
// 			tokenIn: "0x80d6d3946ed8a1da4e226aa21ccddc32bd127d1a",
// 			tokenOut: "0xb77eb1a70a96fdaaeb31db1b42f2b8b5846b2613",
// 		},
// 		{
// 			swapKind: SwapKind.GivenOut,
// 			amount: 2000n,
// 			tokenIn: "0x80d6d3946ed8a1da4e226aa21ccddc32bd127d1a",
// 			tokenOut: "0xb77eb1a70a96fdaaeb31db1b42f2b8b5846b2613",
// 		},
// 	],
// });

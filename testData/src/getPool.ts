import { WeightedPool } from "./weightedPool";
import type { TestInput, PoolBase } from "./types";

export async function getPool(testInput: TestInput): Promise<PoolBase> {
	// Find onchain data fetching via pool type
	const poolData = {
		Weighted: new WeightedPool(testInput.rpcUrl, testInput.chainId),
	};
	if (!poolData[testInput.poolType])
		throw new Error("getPool: Unsupported pool type");

	console.log("Fetching pool data...");
	const immutable = await poolData[testInput.poolType].fetchImmutableData(
		testInput.poolAddress,
	);
	const mutable = await poolData[testInput.poolType].fetchMutableData(
		testInput.poolAddress,
	);
	console.log("Done");

	return {
		chainId: testInput.chainId,
		blockNumber: testInput.blockNumber,
		poolType: testInput.poolType,
		address: testInput.poolAddress,
		...immutable,
		...mutable,
	};
}

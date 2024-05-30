import type { WeightedImmutable, WeightedMutable } from "@/weighted/data";
import * as fs from "node:fs";
import * as path from "node:path";

type PoolBase = {
	chainId: number;
	blockNumber: number;
	poolType: string;
	poolAddress: string;
};

type WeightedPool = PoolBase & WeightedImmutable & WeightedMutable;

type PoolsMap = Map<string, WeightedPool>;

type Swap = {
	swapKind: number;
	amountRaw: bigint;
	outputRaw: bigint;
	tokenIn: string;
	tokenOut: string;
	test: string;
};

type Add = {
	kind: number;
	inputAmountsRaw: bigint[];
	tokens: string[];
	decimals: number[];
	bptOutRaw: bigint;
	test: string;
};

type TestData = {
	swaps: Swap[];
	adds: Add[];
	pools: PoolsMap;
};

// Reads all json test files and parses to relevant swap/pool bigint format
export function readTestData(directoryPath: string): TestData {
	const pools: PoolsMap = new Map<string, WeightedPool>();
	const swaps: Swap[] = [];
	const adds: Add[] = [];
	const testData: TestData = {
		swaps,
		adds,
		pools,
	};

	// Resolve the directory path relative to the current file's directory
	const absoluteDirectoryPath = path.resolve(__dirname, directoryPath);

	// Read all files in the directory
	const files = fs.readdirSync(absoluteDirectoryPath);

	// Iterate over each file
	for (const file of files) {
		// Check if the file ends with .json
		if (file.endsWith(".json")) {
			// Read the file content
			const fileContent = fs.readFileSync(
				path.join(absoluteDirectoryPath, file),
				"utf-8",
			);

			// Parse the JSON content
			try {
				const jsonData = JSON.parse(fileContent);
				if (jsonData.swaps)
					swaps.push(
						...jsonData.swaps.map((swap) => ({
							...swap,
							swapKind: Number(swap.swapKind),
							amountRaw: BigInt(swap.amountRaw),
							outputRaw: BigInt(swap.outputRaw),
							test: file,
						})),
					);
				pools.set(file, {
					...jsonData.pool,
					scalingFactors: jsonData.pool.scalingFactors.map((sf) => BigInt(sf)),
					weights: jsonData.pool.weights.map((w) => BigInt(w)),
					swapFee: BigInt(jsonData.pool.swapFee),
					balances: jsonData.pool.balances.map((b) => BigInt(b)),
					tokenRates: jsonData.pool.tokenRates.map((r) => BigInt(r)),
					totalSupply: BigInt(jsonData.pool.totalSupply)
				});
				if (jsonData.adds)
					adds.push(
						...jsonData.adds.map((add) => ({
							...add,
							kind: add.kind === "Proportional" ? 0 : 1,
							inputAmountsRaw: add.inputAmountsRaw.map((a) => BigInt(a)),
							bptOutRaw: BigInt(add.bptOutRaw),
							test: file,
						})),
					);
			} catch (error) {
				console.error(`Error parsing JSON file ${file}:`, error);
			}
		}
	}

	return testData;
}

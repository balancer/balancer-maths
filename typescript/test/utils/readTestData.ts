// pnpm test -- swaps.test.ts
import type { WeightedImmutable, WeightedMutable } from "@/weighted/data";
import * as fs from "node:fs";
import * as path from "node:path";

type JsonSwap = {
	swapType: string;
	amount: string;
	output: string;
	tokenIn: string;
	tokenOut: string;
};

type JsonTestData = {
	swaps: JsonSwap[];
	pool: WeightedPool;
};

type PoolBase = {
	chainId: number;
	blockNumber: number;
	poolType: string;
	address: string;
};

type WeightedPool = PoolBase & WeightedImmutable & WeightedMutable;

type PoolsMap = Map<string, WeightedPool>;

type Swap = JsonSwap & { test: string };

type TestData = {
	swaps: Swap[];
	pools: PoolsMap;
};

// Function to read all JSON files from a directory
export function readTestData(directoryPath: string): TestData {
	const pools: PoolsMap = new Map<string, WeightedPool>();
	const swaps: Swap[] = [];
	const testData: TestData = {
		swaps,
		pools,
	};

	// Resolve the directory path relative to the current file's directory
	console.log(__dirname);
	console.log(directoryPath);
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

			// Parse the JSON content and add it to the array
			try {
				const jsonData: JsonTestData = JSON.parse(fileContent);
				swaps.push(...jsonData.swaps.map((swap) => ({ ...swap, test: file })));
				pools.set(file, jsonData.pool);
			} catch (error) {
				console.error(`Error parsing JSON file ${file}:`, error);
			}
		}
	}

	return testData;
}

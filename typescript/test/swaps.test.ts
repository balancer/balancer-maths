// pnpm test -- swaps.test.ts
import { describe, expect, test } from "vitest";
import * as fs from "fs";
import * as path from "path";

type Swap = {
	swapType: string;
	amount: string;
	output: string;
};

type Pool = {
	poolType: string;
	tokens: string[];
};

type JsonTestData = {
	swaps: Swap[];
	pool: Pool;
};

type TestSwap = Swap & { test: string };

type TestData = {
	swaps: TestSwap[];
	pools: Map<string, Pool>;
};

// Function to read all JSON files from a directory
const readJsonFilesFromDirectory = (directoryPath: string): TestData => {
	const pools = new Map<string, Pool>();
	const jsonFiles: TestSwap[] = [];
	const testData: TestData = {
		swaps: jsonFiles,
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

			// Parse the JSON content and add it to the array
			try {
				const jsonData: JsonTestData = JSON.parse(fileContent);
				jsonFiles.push(
					...jsonData.swaps.map((swap) => ({ ...swap, test: file })),
				);
				pools.set(file, jsonData.pool);
			} catch (error) {
				console.error(`Error parsing JSON file ${file}:`, error);
			}
		}
	}

	return testData;
};

const testLoad = readJsonFilesFromDirectory("../../testData/swapData");

describe("swap tests", () => {
	test.each(testLoad.swaps)(
		"$test $swapType $amount",
		async ({ test, amount }) => {
			const pool = testLoad.pools.get(test);
			expect(test).toBe("Weighted");
		},
	);
});

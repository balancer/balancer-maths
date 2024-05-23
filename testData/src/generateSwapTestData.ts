import { SwapKind } from "@balancer/sdk";
import type { TestInput, TestData } from "./types";
import { getSwaps } from "./getSwaps";
import { getPool } from "./getPool";

export async function generateSwapTestData(input: TestInput) {
	console.log("Generating test data with input:\n", input);
	const testData = await fetchTestData(input);
	const path = `./swapData/${input.testName}.json`;
	console.log("Saving test data to: ", path);
	await Bun.write(path, JSON.stringify(testData));
	console.log("Complete");
}

async function fetchTestData(input: TestInput): Promise<TestData> {
	const pool = await getPool(input);
	const swapResults = await getSwaps(input);
	return {
		swaps: swapResults,
		pool,
	};
}

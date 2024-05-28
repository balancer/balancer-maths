import type { TestInput, TestData } from "./types";
import { getSwaps } from "./getSwaps";
import { getPool } from "./getPool";

export async function generateSwapTestData(
	input: TestInput,
	overwrite = false,
) {
	const path = `./swapData/${input.chainId}-${input.blockNumber}-${input.testName}.json`;
	if (!overwrite) {
		const file = Bun.file(path);
		if (await file.exists()) {
			console.log('File already exists and overwrite set to false.', path);
			return
		}
	}
	console.log("Generating test data with input:\n", input);
	const testData = await fetchTestData(input);
	console.log("Saving test data to: ", path);
	await Bun.write(path, JSON.stringify(testData, null, 4));
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

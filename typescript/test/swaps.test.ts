// pnpm test -- swaps.test.ts
import { describe, expect, test } from "vitest";
import { readTestData } from "./utils/readTestData";

const testData = readTestData("../../../testData/swapData");

describe("swap tests", () => {
	test.each(testData.swaps)(
		"$test $swapKind $amount",
		async ({ test, amount, tokenIn, tokenOut, output }) => {
			const pool = testData.pools.get(test);
			console.log("Amount: ", amount);
			console.log(`${tokenIn}>${tokenOut}`);
			console.log("Output: ", output);
			const calculatedAmount = 1n;
			expect(calculatedAmount.toString()).toEqual(output);
		},
	);
});

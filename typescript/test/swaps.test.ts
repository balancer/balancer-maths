// pnpm test -- swaps.test.ts
import { describe, expect, test } from "vitest";
import { readTestData } from "./utils/readTestData";
import { Vault } from "../src/vault/vault";

const testData = readTestData("../../../testData/testData");

describe("swap tests", () => {
	test.each(testData.swaps)(
		"$test $swapKind $amount",
		async ({ test, amountRaw, tokenIn, tokenOut, outputRaw, swapKind }) => {
			const pool = testData.pools.get(test);
			if (!pool) throw new Error("No pool data");
			// console.log("Amount: ", amountRaw);
			// console.log(`${tokenIn}>${tokenOut}`);
			// console.log("Output: ", outputRaw);
			const vault = new Vault();

			const calculatedAmount = vault.swap(
				{
					amountRaw,
					tokenIn,
					tokenOut,
					swapKind,
				},
				pool,
			);
			expect(calculatedAmount).toEqual(outputRaw);
		},
	);
});

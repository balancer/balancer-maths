// pnpm test -- swaps.test.ts
import { describe, expect, test } from "vitest";
import { readTestData } from "./utils/readTestData";
import { Vault } from "../src/vault/vault";

const testData = readTestData("../../../testData/testData");

describe("addLiqudity tests", () => {
	test.each(testData.adds)(
		"$test $kind",
		async ({ test, inputAmountsRaw, outputRaw, kind }) => {
			const pool = testData.pools.get(test);
			if (!pool) throw new Error("No pool data");
			console.log("Input Amounts: ", inputAmountsRaw);
			console.log("Output: ", outputRaw);
			const vault = new Vault();

			// const calculatedAmount = vault.swap(
			// 	{
			// 		amountRaw,
			// 		tokenIn,
			// 		tokenOut,
			// 		swapKind,
			// 	},
			// 	pool,
			// );
			// expect(calculatedAmount).toEqual(outputRaw);
			expect(outputRaw).toEqual(1n);
		},
	);
});

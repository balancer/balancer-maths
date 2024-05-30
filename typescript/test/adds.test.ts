// pnpm test -- swaps.test.ts
import { describe, expect, test } from "vitest";
import { readTestData } from "./utils/readTestData";
import { Vault } from "../src/vault/vault";

const testData = readTestData("../../../testData/testData");

describe("addLiqudity tests", () => {
	test.each(testData.adds)(
		"$test $kind",
		async ({ test, inputAmountsRaw, bptOutRaw, kind }) => {
			const pool = testData.pools.get(test);
			if (!pool) throw new Error("No pool data");
			// console.log("Input Amounts: ", inputAmountsRaw);
			// console.log("BptOut: ", bptOutRaw);
			const vault = new Vault();

			const calculatedAmounts = vault.addLiquidity(
				{
					pool: pool.poolAddress,
					maxAmountsIn: inputAmountsRaw,
					minBptAmountOut: bptOutRaw,
					kind,
				},
				pool,
			);
			expect(calculatedAmounts.bptAmountOut).toEqual(bptOutRaw);
			expect(calculatedAmounts.amountsIn).toEqual(inputAmountsRaw);
		},
	);
});

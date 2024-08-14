// pnpm test -- swaps.test.ts
import { describe, expect, test } from 'vitest';
import { Vault } from '../src';
import { readTestData } from './utils/readTestData';

const testData = readTestData('../../../testData/testData');

describe('addLiqudity tests', () => {
    test.each(testData.adds)(
        '$test $kind',
        async ({ test, inputAmountsRaw, bptOutRaw, kind }) => {
            const pool = testData.pools.get(test);
            if (!pool) throw new Error('No pool data');
            if (pool.poolType === 'Buffer')
                throw Error('Buffer pools do not support addLiquidity');
            // console.log("Input Amounts: ", inputAmountsRaw);
            // console.log("BptOut: ", bptOutRaw);
            const vault = new Vault();

            const calculatedAmounts = vault.addLiquidity(
                {
                    pool: pool.poolAddress,
                    maxAmountsInRaw: inputAmountsRaw,
                    minBptAmountOutRaw: bptOutRaw,
                    kind,
                },
                pool,
            );
            expect(calculatedAmounts.bptAmountOutRaw).toEqual(bptOutRaw);
            expect(calculatedAmounts.amountsInRaw).toEqual(inputAmountsRaw);
        },
    );
});

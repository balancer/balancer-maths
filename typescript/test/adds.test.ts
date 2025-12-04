// pnpm test -- adds.test.ts
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
                pool.hook,
            );
            /**
             * Relax test assertion to accept off-by-1 error because testData might
             * return amounts off-by-1 when compared to actual implementations.
             * e.g. getCurrentLiveBalances rounds pools balances down, while solidity
             * rounds pool balances up when loading pool data within add liquidity operations
             */
            expect(calculatedAmounts.bptAmountOutRaw).toBeGreaterThanOrEqual(
                bptOutRaw - 1n,
            );
            expect(calculatedAmounts.bptAmountOutRaw).toBeLessThanOrEqual(
                bptOutRaw + 1n,
            );
            expect(calculatedAmounts.amountsInRaw).toEqual(inputAmountsRaw);
        },
    );
});

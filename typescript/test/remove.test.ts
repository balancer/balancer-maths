// pnpm test -- remove.test.ts
import { describe, expect, test } from 'vitest';
import { Vault } from '../src';
import { readTestData } from './utils/readTestData';

const testData = readTestData('../../../testData/testData');

describe('removeLiqudity tests', () => {
    test.each(testData.removes)(
        '$test $kind',
        async ({ test, bptInRaw, amountsOutRaw, kind }) => {
            const pool = testData.pools.get(test);
            if (!pool) throw new Error('No pool data');
            if (pool.poolType === 'Buffer')
                throw Error('Buffer pools do not support removeLiquidity');
            const vault = new Vault();

            const calculatedAmounts = vault.removeLiquidity(
                {
                    pool: pool.poolAddress,
                    minAmountsOutRaw: amountsOutRaw,
                    maxBptAmountInRaw: bptInRaw,
                    kind,
                },
                pool,
            );
            expect(calculatedAmounts.bptAmountInRaw).toEqual(bptInRaw);
            expect(calculatedAmounts.amountsOutRaw).toEqual(amountsOutRaw);
        },
    );
});

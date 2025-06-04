// pnpm test -- swaps.test.ts
import { describe, expect, test } from 'vitest';
import { Vault } from '../src';
import { readTestData } from './utils/readTestData';

const testData = readTestData('../../../testData/testData');

describe('swap tests', () => {
    test.each(testData.swaps)(
        '$test $swapKind $amountRaw',
        async ({ test, amountRaw, tokenIn, tokenOut, outputRaw, swapKind }) => {
            // if (test !== '8453-31094200-ReClamm-WETH-USDC-In-Range.json') {
            //     // console.log('Skipping test: ', test);
            //     return;
            // }
            console.log('Running test: ', test);
            const pool = testData.pools.get(test);
            if (!pool) throw new Error('No pool data');
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
            if (pool.poolType === 'Buffer') {
                const isOk = areBigIntsWithinPercent(
                    calculatedAmount,
                    outputRaw,
                    0.001,
                );
                expect(isOk).toBe(true);
            } else {
                expect(calculatedAmount).toEqual(outputRaw);
            }
        },
    );
});

function areBigIntsWithinPercent(
    value1: bigint,
    value2: bigint,
    percent: number,
): boolean {
    if (percent < 0) {
        throw new Error('Percent must be non-negative');
    }
    const difference = value1 > value2 ? value1 - value2 : value2 - value1;
    console.log('Buffer Difference: ', difference);
    const percentFactor = BigInt(Math.floor(percent * 1e8));
    const tolerance = (value2 * percentFactor) / BigInt('10000000000');
    return difference <= tolerance;
}

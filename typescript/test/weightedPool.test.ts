import { describe, expect, test } from 'vitest';
import { SwapKind } from '../src/index';
import { Weighted } from '../src/weighted';

describe('weighted pool', () => {
    const pool = new Weighted({
        weights: [60000000000000000000n, 40000000000000000000n],
    });
    describe('getMaxSwapAmount', () => {
        test('exact in', () => {
            const swapParams = {
                swapKind: SwapKind.GivenIn,
                amountGivenScaled18: 0n,
                balancesLiveScaled18: [
                    60000000000000000000n,
                    40000000000000000000n,
                ],
                tokenRates: [1000000000000000000n, 1000000000000000000n],
                scalingFactors: [
                    1000000000000000000n,
                    1000000000000000000000000000000n,
                ],
                indexIn: 0,
                indexOut: 1,
            };
            const maxSwapAmount = pool.getMaxSwapAmount(swapParams);
            expect(maxSwapAmount).to.eq(18000000000000000000n);
        });
        test('exact out', () => {
            const swapParams = {
                swapKind: SwapKind.GivenOut,
                amountGivenScaled18: 0n,
                balancesLiveScaled18: [
                    60000000000000000000n,
                    40000000000000000000n,
                ],
                tokenRates: [1000000000000000000n, 1000000000000000000n],
                scalingFactors: [
                    1000000000000000000n,
                    1000000000000000000000000000000n,
                ],
                indexIn: 0,
                indexOut: 1,
            };
            const maxSwapAmount = pool.getMaxSwapAmount(swapParams);
            expect(maxSwapAmount).to.eq(12000000n);
        });
    });
});

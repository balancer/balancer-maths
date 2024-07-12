import { describe, expect, test } from 'vitest';
import { SwapKind } from '../src/index';
import { Stable } from '../src/stable';

describe('stable pool', () => {
    const pool = new Stable({
        amp: 60000000000000000000n,
    });
    describe('getMaxSwapAmount', () => {
        describe('no rate', () => {
            test('exact in', () => {
                const swapParams = {
                    swapKind: SwapKind.GivenIn,
                    amountGivenScaled18: 0n,
                    balancesLiveScaled18: [
                        60000000000000000000n,
                        40000000000000000000n,
                    ],
                    tokenRates: [1000000000000000000n, 1000000000000000000n],
                    scalingFactors: [1000000000000000000000000000000n, 1000000000000000000n],
                    indexIn: 0,
                    indexOut: 1,
                };
                const maxSwapAmount = pool.getMaxSwapAmount(swapParams);
                expect(maxSwapAmount).to.eq(40000000n);
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
                    scalingFactors: [1000000000000000000000000000000n, 1000000000000000000n],
                    indexIn: 0,
                    indexOut: 1,
                };
                const maxSwapAmount = pool.getMaxSwapAmount(swapParams);
                expect(maxSwapAmount).to.eq(40000000000000000000n);
            });
        });
        describe('with rate', () => {
            test('exact in', () => {
                const swapParams = {
                    swapKind: SwapKind.GivenIn,
                    amountGivenScaled18: 0n,
                    balancesLiveScaled18: [
                        60000000000000000000n,
                        40000000000000000000n,
                    ],
                    tokenRates: [2000000000000000000n, 4000000000000000000n],
                    scalingFactors: [1000000000000000000n, 1000000000000000000000000000000n],
                    indexIn: 0,
                    indexOut: 1,
                };
                const maxSwapAmount = pool.getMaxSwapAmount(swapParams);
                expect(maxSwapAmount).to.eq(80000000000000000000n);
            });
            test('exact out', () => {
                const swapParams = {
                    swapKind: SwapKind.GivenOut,
                    amountGivenScaled18: 0n,
                    balancesLiveScaled18: [
                        60000000000000000000n,
                        40000000000000000000n,
                    ],
                    tokenRates: [2000000000000000000n, 4000000000000000000n],
                    scalingFactors: [1000000000000000000n, 1000000000000000000000000000000n],
                    indexIn: 0,
                    indexOut: 1,
                };
                const maxSwapAmount = pool.getMaxSwapAmount(swapParams);
                expect(maxSwapAmount).to.eq(40000000n);
            });
        });
    });
});

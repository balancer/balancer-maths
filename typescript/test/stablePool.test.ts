// pnpm test -- stablePool.test.ts
import { describe, expect, test } from 'vitest';
import { SwapKind, SwapParams } from '../src/index';
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
                    scalingFactors: [1000000000000n, 1n],
                    indexIn: 0,
                    indexOut: 1,
                };
                const maxSwapAmount = pool.getMaxSwapAmount(swapParams);
                expect(maxSwapAmount).to.eq(340282366920938463403374607n);
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
                    scalingFactors: [1000000000000n, 1n],
                    indexIn: 0,
                    indexOut: 1,
                };
                const maxSwapAmount = pool.getMaxSwapAmount(swapParams);
                expect(maxSwapAmount).to.eq(340282366920938463403374607n);
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
                    scalingFactors: [1n, 1000000000000n],
                    indexIn: 0,
                    indexOut: 1,
                };
                const maxSwapAmount = pool.getMaxSwapAmount(swapParams);
                expect(maxSwapAmount).to.eq(
                    170141183460469231701687303715884105728n,
                );
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
                    scalingFactors: [1n, 1000000000000n],
                    indexIn: 0,
                    indexOut: 1,
                };
                const maxSwapAmount = pool.getMaxSwapAmount(swapParams);
                expect(maxSwapAmount).to.eq(
                    170141183460469231701687303715884105728n,
                );
            });
        });
    });
    describe('onSwap', () => {
        test('matches onchain results', () => {
            // sim https://dashboard.tenderly.co/mcquardt/project/simulator/f174cf82-3525-4376-b13d-9e61bad1649c?trace=0
            const tempPool = new Stable({
                amp: 1000000n,
            });

            const swapParams: SwapParams = {
                swapKind: SwapKind.GivenIn,
                amountGivenScaled18: 99500000000000000000n,
                balancesLiveScaled18: [
                    20000000000000000000000n,
                    20000000000000000000000n,
                ],
                indexIn: 0,
                indexOut: 1,
            };

            const amountOut = tempPool.onSwap(swapParams);
            expect(amountOut).toEqual(99499505472260433154n);
        });
    });
});

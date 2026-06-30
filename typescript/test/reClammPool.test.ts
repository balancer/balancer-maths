// pnpm test -- reClammPool.test.ts
import { describe, expect, test } from 'vitest';
import { SwapKind } from '../src/index';
import { ReClamm } from '../src/reClamm';
import { toScaled18ApplyRateRoundDown } from '../src/vault/utils';

describe('reClamm pool', () => {
    const pool = new ReClamm({
        lastTimestamp: 1745855815n,
        lastVirtualBalances: [5292078522152179508n, 9325176954769209651335n],
        dailyPriceShiftBase: 999991977472743464n,
        centerednessMargin: 100000000000000000n,
        startFourthRootPriceRatio: 0n,
        endFourthRootPriceRatio: 1010696708667094804n,
        priceRatioUpdateStartTime: 1745855663n,
        priceRatioUpdateEndTime: 1745855663n,
        currentTimestamp: 1745855847n,
    });
    describe('getMaxSwapAmount', () => {
        test('exact in, 18 decimals', () => {
            const swapParams = {
                swapKind: SwapKind.GivenIn,
                amountGivenScaled18: 0n,
                balancesLiveScaled18: [
                    14552907646299798n,
                    174459788000000000000n,
                ],
                tokenRates: [1000000000000000000n, 1000000000000000000n],
                scalingFactors: [1n, 1000000000000n],
                indexIn: 0,
                indexOut: 1,
            };
            // getMaxSwapAmount returns a raw amount, so it must be scaled back to 18 decimals
            // (applying the rate) before being used as `amountGivenScaled18` in onSwap.
            const maxSwapAmount = pool.getMaxSwapAmount(swapParams);
            const amountGivenScaled18 = toScaled18ApplyRateRoundDown(
                maxSwapAmount,
                swapParams.scalingFactors[swapParams.indexIn],
                swapParams.tokenRates[swapParams.indexIn],
            );
            const sp = { ...swapParams, amountGivenScaled18 };
            expect(() => pool.onSwap(sp)).not.toThrow();
        });
        test('exact out, 6 decimals', () => {
            const swapParams = {
                swapKind: SwapKind.GivenOut,
                amountGivenScaled18: 0n,
                balancesLiveScaled18: [
                    14552907646299798n,
                    174459788000000000000n,
                ],
                tokenRates: [1000000000000000000n, 1000000000000000000n],
                scalingFactors: [1n, 1000000000000n],
                indexIn: 0,
                indexOut: 1,
            };
            const maxSwapAmount = pool.getMaxSwapAmount(swapParams);
            const amountGivenScaled18 = toScaled18ApplyRateRoundDown(
                maxSwapAmount,
                swapParams.scalingFactors[swapParams.indexOut],
                swapParams.tokenRates[swapParams.indexOut],
            );
            const sp = { ...swapParams, amountGivenScaled18 };
            expect(() => pool.onSwap(sp)).not.toThrow();
        });
        test('exact in, 6 decimals', () => {
            const swapParams = {
                swapKind: SwapKind.GivenIn,
                amountGivenScaled18: 0n,
                balancesLiveScaled18: [
                    14552907646299798n,
                    174459788000000000000n,
                ],
                tokenRates: [1000000000000000000n, 1000000000000000000n],
                scalingFactors: [1n, 1000000000000n],
                indexIn: 1,
                indexOut: 0,
            };
            const maxSwapAmount = pool.getMaxSwapAmount(swapParams);
            const amountGivenScaled18 = toScaled18ApplyRateRoundDown(
                maxSwapAmount,
                swapParams.scalingFactors[swapParams.indexIn],
                swapParams.tokenRates[swapParams.indexIn],
            );
            const sp = { ...swapParams, amountGivenScaled18 };
            expect(() => pool.onSwap(sp)).not.toThrow();
        });
        test('exact out, 18 decimals', () => {
            const swapParams = {
                swapKind: SwapKind.GivenOut,
                amountGivenScaled18: 0n,
                balancesLiveScaled18: [
                    14552907646299798n,
                    174459788000000000000n,
                ],
                tokenRates: [1000000000000000000n, 1000000000000000000n],
                scalingFactors: [1n, 1000000000000n],
                indexIn: 1,
                indexOut: 0,
            };
            const maxSwapAmount = pool.getMaxSwapAmount(swapParams);
            const amountGivenScaled18 = toScaled18ApplyRateRoundDown(
                maxSwapAmount,
                swapParams.scalingFactors[swapParams.indexOut],
                swapParams.tokenRates[swapParams.indexOut],
            );
            const sp = { ...swapParams, amountGivenScaled18 };
            expect(() => pool.onSwap(sp)).not.toThrow();
        });
        describe('with rate', () => {
            test('exact in, returns raw amount (not scaled18)', () => {
                const swapParams = {
                    swapKind: SwapKind.GivenIn,
                    amountGivenScaled18: 0n,
                    balancesLiveScaled18: [
                        14552907646299798n,
                        174459788000000000000n,
                    ],
                    // indexOut token has a 1.5 rate, so balancesLiveScaled18 != raw balances
                    tokenRates: [1000000000000000000n, 1500000000000000000n],
                    scalingFactors: [1n, 1n],
                    indexIn: 0,
                    indexOut: 1,
                };
                const maxSwapAmount = pool.getMaxSwapAmount(swapParams);

                // The result must be a raw amount: scaling it back up by the indexIn token's
                // rate/scalingFactor should reproduce a valid scaled18 swap input.
                const amountGivenScaled18 = toScaled18ApplyRateRoundDown(
                    maxSwapAmount,
                    swapParams.scalingFactors[swapParams.indexIn],
                    swapParams.tokenRates[swapParams.indexIn],
                );
                const sp = { ...swapParams, amountGivenScaled18 };
                expect(() => pool.onSwap(sp)).not.toThrow();

                // Sanity check: with a rate of 1 on indexIn, raw == scaled18 here, so the max
                // amount in must be well below the full indexOut balance (since only 99% of it
                // is targeted, and the rate on indexOut is > 1).
                expect(maxSwapAmount).toBeGreaterThan(0n);
                expect(maxSwapAmount).toBeLessThan(
                    swapParams.balancesLiveScaled18[swapParams.indexOut],
                );
            });
            test('exact out, returns raw amount (not scaled18)', () => {
                const swapParams = {
                    swapKind: SwapKind.GivenOut,
                    amountGivenScaled18: 0n,
                    balancesLiveScaled18: [
                        14552907646299798n,
                        174459788000000000000n,
                    ],
                    // indexOut token has a 1.5 rate, so balancesLiveScaled18 != raw balance
                    tokenRates: [1000000000000000000n, 1500000000000000000n],
                    scalingFactors: [1n, 1n],
                    indexIn: 0,
                    indexOut: 1,
                };
                const maxSwapAmount = pool.getMaxSwapAmount(swapParams);

                // Expected raw amount: 99% of balancesLiveScaled18[indexOut], converted back to
                // raw by removing the indexOut token's rate.
                const expectedMaxAmountOutScaled18 =
                    (990000000000000000n *
                        swapParams.balancesLiveScaled18[
                            swapParams.indexOut
                        ]) /
                    1000000000000000000n;
                const expectedRaw =
                    (expectedMaxAmountOutScaled18 * 1000000000000000000n) /
                    swapParams.tokenRates[swapParams.indexOut];
                expect(maxSwapAmount).toEqual(expectedRaw);

                // It must be strictly less than balancesLiveScaled18[indexOut], proving the
                // rate has been removed (previously this returned the scaled18 value directly).
                expect(maxSwapAmount).toBeLessThan(
                    swapParams.balancesLiveScaled18[swapParams.indexOut],
                );

                const amountGivenScaled18 = toScaled18ApplyRateRoundDown(
                    maxSwapAmount,
                    swapParams.scalingFactors[swapParams.indexOut],
                    swapParams.tokenRates[swapParams.indexOut],
                );
                const sp = { ...swapParams, amountGivenScaled18 };
                expect(() => pool.onSwap(sp)).not.toThrow();
            });
        });
    });
});

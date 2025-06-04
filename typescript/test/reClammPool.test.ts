// pnpm test -- reClammPool.test.ts
import { describe, expect, test } from 'vitest';
import { SwapKind } from '../src/index';
import { ReClamm } from '../src/reClamm';

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
            const maxSwapAmount = pool.getMaxSwapAmount(swapParams);
            const sp = { ...swapParams, amountGivenScaled18: maxSwapAmount };
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
            const sp = { ...swapParams, amountGivenScaled18: maxSwapAmount };
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
            const sp = { ...swapParams, amountGivenScaled18: maxSwapAmount };
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
            const sp = { ...swapParams, amountGivenScaled18: maxSwapAmount };
            expect(() => pool.onSwap(sp)).not.toThrow();
        });
    });
});

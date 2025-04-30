// pnpm test -- reClammPool.test.ts
import { describe, expect, test } from 'vitest';
import { SwapKind } from '../src/index';
import { ReClamm } from '../src/reClamm';

describe('reClamm pool', () => {
    const pool = new ReClamm({
        lastTimestamp: 1744790653n,
        lastVirtualBalances: [943712943000000n, 1887425886000000000n],
        dailyPriceShiftBase: 8022527256536n,
        centerednessMargin: 200000000000000000n,
        startFourthRootPriceRatio: 0n,
        endFourthRootPriceRatio: 1414213562373095048n,
        priceRatioUpdateStartTime: 1744790653n,
        priceRatioUpdateEndTime: 1744790653n,
        currentTimestamp: 1744790655n,
    });
    describe('getMaxSwapAmount', () => {
        test('exact in, 18 decimals', () => {
            const swapParams = {
                swapKind: SwapKind.GivenIn,
                amountGivenScaled18: 0n,
                balancesLiveScaled18: [250000000000000n, 1096856000000000000n],
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
                balancesLiveScaled18: [250000000000000n, 1096856000000000000n],
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
                balancesLiveScaled18: [250000000000000n, 1096856000000000000n],
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
                balancesLiveScaled18: [250000000000000n, 1096856000000000000n],
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

// pnpm test -- reClammPool.test.ts
import { describe, expect, test } from 'vitest';
import { SwapKind } from '../src/index';
import { ReClamm } from '../src/reClamm';
import { MathSol } from '../src/utils/math';
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
        test('error check', () => {
            const result = MathSol.mulDownFixed(
                86645279375392931791000000000000000000n,
                MathSol.powDownFixed(
                    999999197747274347000000000000000000n,
                    (1752072797n - 1751988959n) * 1000000000000000000n,
                ),
            );
            console.log(result);
            const result2 = MathSol.mulDownFixed(
                86645279375392931791000000000000000000n,
                MathSol.powDownFixed(
                    999999197747274347000000000000000000n,
                    (1752128367n - 1751988959n) * 1000000000000000000n,
                ),
            );
            console.log(result2);
        });
        test.only('make get maxSwapAmount throw', () => {
            const reclamm2 = new ReClamm({
                lastTimestamp: 1751988959n,
                lastVirtualBalances: [
                    86645279375392931791000000000000000000n,
                    100696950322433198293000000000000000000n,
                ],
                dailyPriceShiftBase: 999999197747274347000000000000000000n,
                centerednessMargin: 500000000000000000000000000000000000n,
                startFourthRootPriceRatio:
                    1011900417200324692000000000000000000n,
                endFourthRootPriceRatio: 1011900417200324692000000000000000000n,
                priceRatioUpdateStartTime: 1751988959n,
                priceRatioUpdateEndTime: 1751988959n,
                currentTimestamp: 1752134383n,
            });
            const swapParams = {
                swapKind: SwapKind.GivenIn,
                amountGivenScaled18: 0n,
                balancesLiveScaled18: [
                    3239021481000000000000n,
                    6280318439000000000000n,
                ],
                tokenRates: [1000000000000000000n, 1000000000000000000n],
                scalingFactors: [1000000000000n, 1000000000000n],
                indexIn: 0,
                indexOut: 1,
            };

            const maxSwapAmount = pool.getMaxSwapAmount(swapParams);
            const sp = { ...swapParams, amountGivenScaled18: maxSwapAmount };
            expect(() => pool.onSwap(sp)).not.toThrow();
        });
    });
});

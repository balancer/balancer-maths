//  pnpm test -- liquidityBootstrappingPool.test.ts
import { describe, expect, test } from 'vitest';
import { SwapKind } from '../src/index';
import { LiquidityBootstrapping } from '../src/liquidityBootstrapping';

describe('liquidityBootstrappingPool pool', () => {
    const pool = new LiquidityBootstrapping({
        weights: [60000000000000000000n, 40000000000000000000n],
    });
    describe('getMaxSwapAmount', () => {
        test('exact in, 18 decimals', () => {
            const swapParams = {
                swapKind: SwapKind.GivenIn,
                amountGivenScaled18: 0n,
                balancesLiveScaled18: [
                    60000000000000000000n,
                    40000000000000000000n,
                ],
                tokenRates: [1000000000000000000n, 1000000000000000000n],
                scalingFactors: [1n, 1000000000000n],
                indexIn: 0,
                indexOut: 1,
            };
            const maxSwapAmount = pool.getMaxSwapAmount(swapParams);
            expect(maxSwapAmount).to.eq(18000000000000000000n);
        });
        test('exact in, 6 decimals', () => {
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
            expect(maxSwapAmount).to.eq(18000000n);
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
                scalingFactors: [1n, 1000000000000n],
                indexIn: 0,
                indexOut: 1,
            };
            const maxSwapAmount = pool.getMaxSwapAmount(swapParams);
            expect(maxSwapAmount).to.eq(12000000n);
        });
        test('exact out', () => {
            const pool = new LiquidityBootstrapping({
                weights: [
                    330000000000000000n,
                    330000000000000000n,
                    340000000000000000n,
                ],
            });
            const swapParams = {
                swapKind: SwapKind.GivenIn,
                amountGivenScaled18: 0n,
                balancesLiveScaled18: [
                    3000000000000000000n,
                    2341576000000000000n,
                    3000000000000000000n,
                ],
                tokenRates: [
                    1000000000000000000n,
                    1000000000000000000n,
                    1000000000000000000n,
                ],
                scalingFactors: [1000000000000n, 1000000000000n, 1n],
                indexIn: 2,
                indexOut: 0,
            };
            const maxSwapAmount = pool.getMaxSwapAmount(swapParams);
            expect(maxSwapAmount).to.eq(900000000000000000n);
        });
    });
});

//  pnpm test -- liquidityBootstrappingPool.test.ts

import { describe, expect, test } from 'vitest';
import { getNormalizedWeights } from '../src/utils/liquidityBootstrapping';
import { SwapKind } from '../src/index';
import { LiquidityBootstrappingState } from '../src/liquidityBootstrapping/data';
import { LiquidityBootstrapping } from '../src/liquidityBootstrapping/liquidityBootstrapping';
describe('liquidityBootstrappingPool pool', () => {
    const poolState = {
        currentTimestamp: 1744204169n,
        poolAddress: '0x1234567890abcdef1234567890abcdef12345678',
        startTime: 1744204169n,
        endTime: 1744546169n,
        projectTokenIndex: 0,
        startWeights: [500000000000000000n, 500000000000000000n],
        endWeights: [10000000000000000n, 90000000000000000n],
        isSwapEnabled: true,
        isProjectTokenSwapInBlocked: false,
    } as LiquidityBootstrappingState;
    const pool = new LiquidityBootstrapping(poolState);

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
    });

    describe('getNormalizedWeights', () => {
        test('calculates normalized weights correctly during progress', () => {
            const projectTokenIndex = 0;
            const currentTime = 1744221012n; // Timestamp at block 8085514
            const startTime = 1744204169n; // Start time
            const endTime = 1744546169n; // End time
            const projectTokenStartWeight = 500000000000000000n; // 50%
            const projectTokenEndWeight = 100000000000000000n; // 10%

            // Expected normalized weights at block 8085514
            const expectedNormalizedWeights = [
                480300584795321638n, // Project token weight
                519699415204678362n, // Reserve token weight
            ];

            const normalizedWeights = getNormalizedWeights(
                projectTokenIndex,
                currentTime,
                startTime,
                endTime,
                projectTokenStartWeight,
                projectTokenEndWeight,
            );

            // Validate the calculated weights match the expected values
            expect(normalizedWeights).toHaveLength(2);
            expect(normalizedWeights[projectTokenIndex]).toEqual(
                expectedNormalizedWeights[projectTokenIndex],
            );
            expect(normalizedWeights[1 - projectTokenIndex]).toEqual(
                expectedNormalizedWeights[1 - projectTokenIndex],
            );
        });

        test('returns start weights when progress is 0%', () => {
            const projectTokenIndex = 0;
            const currentTime = 1744204168n; // Before start time
            const startTime = 1744204169n; // Start time
            const endTime = 1744546169n; // End time
            const projectTokenStartWeight = 500000000000000000n; // 50%
            const projectTokenEndWeight = 100000000000000000n; // 10%

            const normalizedWeights = getNormalizedWeights(
                projectTokenIndex,
                currentTime,
                startTime,
                endTime,
                projectTokenStartWeight,
                projectTokenEndWeight,
            );

            expect(normalizedWeights[projectTokenIndex]).toEqual(
                projectTokenStartWeight,
            );
            expect(normalizedWeights[1 - projectTokenIndex]).toEqual(
                1000000000000000000n - projectTokenStartWeight,
            );
        });

        test('returns end weights when progress is 100%', () => {
            const projectTokenIndex = 0;
            const currentTime = 1744546170n; // After end time
            const startTime = 1744204169n; // Start time
            const endTime = 1744546169n; // End time
            const projectTokenStartWeight = 500000000000000000n; // 50%
            const projectTokenEndWeight = 100000000000000000n; // 10%

            const normalizedWeights = getNormalizedWeights(
                projectTokenIndex,
                currentTime,
                startTime,
                endTime,
                projectTokenStartWeight,
                projectTokenEndWeight,
            );

            expect(normalizedWeights[projectTokenIndex]).toEqual(
                projectTokenEndWeight,
            );
            expect(normalizedWeights[1 - projectTokenIndex]).toEqual(
                1000000000000000000n - projectTokenEndWeight,
            );
        });

        test('handles equal start and end weights', () => {
            const projectTokenIndex = 0;
            const currentTime = 1744375169n; // Midway between start and end
            const startTime = 1744204169n; // Start time
            const endTime = 1744546169n; // End time
            const projectTokenStartWeight = 500000000000000000n; // 50%
            const projectTokenEndWeight = 500000000000000000n; // 50%

            const normalizedWeights = getNormalizedWeights(
                projectTokenIndex,
                currentTime,
                startTime,
                endTime,
                projectTokenStartWeight,
                projectTokenEndWeight,
            );

            expect(normalizedWeights[projectTokenIndex]).toEqual(
                projectTokenStartWeight,
            );
            expect(normalizedWeights[1 - projectTokenIndex]).toEqual(
                1000000000000000000n - projectTokenStartWeight,
            );
        });

        test('handles progress exactly at start time', () => {
            const projectTokenIndex = 0;
            const currentTime = 1744204169n; // Exactly at start time
            const startTime = 1744204169n; // Start time
            const endTime = 1744546169n; // End time
            const projectTokenStartWeight = 500000000000000000n; // 50%
            const projectTokenEndWeight = 100000000000000000n; // 10%

            const normalizedWeights = getNormalizedWeights(
                projectTokenIndex,
                currentTime,
                startTime,
                endTime,
                projectTokenStartWeight,
                projectTokenEndWeight,
            );

            expect(normalizedWeights[projectTokenIndex]).toEqual(
                projectTokenStartWeight,
            );
            expect(normalizedWeights[1 - projectTokenIndex]).toEqual(
                1000000000000000000n - projectTokenStartWeight,
            );
        });

        test('handles progress exactly at end time', () => {
            const projectTokenIndex = 0;
            const currentTime = 1744546169n; // Exactly at end time
            const startTime = 1744204169n; // Start time
            const endTime = 1744546169n; // End time
            const projectTokenStartWeight = 500000000000000000n; // 50%
            const projectTokenEndWeight = 100000000000000000n; // 10%

            const normalizedWeights = getNormalizedWeights(
                projectTokenIndex,
                currentTime,
                startTime,
                endTime,
                projectTokenStartWeight,
                projectTokenEndWeight,
            );

            expect(normalizedWeights[projectTokenIndex]).toEqual(
                projectTokenEndWeight,
            );
            expect(normalizedWeights[1 - projectTokenIndex]).toEqual(
                1000000000000000000n - projectTokenEndWeight,
            );
        });
    });
});

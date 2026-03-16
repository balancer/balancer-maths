//  pnpm test -- fixedPriceLBPPool.test.ts

import { describe, expect, test } from 'vitest';
import { SwapKind, Rounding } from '../src/index';
import { FixedPriceLBPState } from '../src/fixedPriceLBP/data';
import { FixedPriceLBP } from '../src/fixedPriceLBP/fixedPriceLBP';

describe('fixedPriceLBP pool', () => {
    // 1 PROJECT = 0.1 USDC (rate = 0.1e18)
    const poolState = {
        poolAddress: '0x1234567890abcdef1234567890abcdef12345678',
        poolType: 'FIXED_PRICE_LBP' as const,
        tokens: ['0xProjectToken', '0xReserveToken'],
        scalingFactors: [1n, 1n],
        tokenRates: [1000000000000000000n, 1000000000000000000n],
        balancesLiveScaled18: [
            100000000000000000000n, // 100 project tokens
            10000000000000000000n, // 10 reserve tokens
        ],
        swapFee: 0n,
        aggregateSwapFee: 0n,
        totalSupply: 1000000000000000000n,
        supportsUnbalancedLiquidity: false,
        projectTokenIndex: 0,
        reserveTokenIndex: 1,
        projectTokenRate: 100000000000000000n, // 0.1e18
        startTime: 1000000n,
        endTime: 2000000n,
        isSwapEnabled: true,
        currentTimestamp: 1500000n,
    } as FixedPriceLBPState;

    const pool = new FixedPriceLBP(poolState);

    describe('onSwap', () => {
        test('exactIn: reserve in, project out', () => {
            // Swap 1 reserve token in, expect 10 project tokens out (1 / 0.1 = 10)
            const result = pool.onSwap({
                swapKind: SwapKind.GivenIn,
                amountGivenScaled18: 1000000000000000000n, // 1e18
                balancesLiveScaled18: poolState.balancesLiveScaled18,
                indexIn: 1, // reserve
                indexOut: 0, // project
            });
            // divDown(1e18, 0.1e18) = 10e18
            expect(result).toEqual(10000000000000000000n);
        });

        test('exactOut: reserve in, project out', () => {
            // Want 10 project tokens out, how much reserve in?
            const result = pool.onSwap({
                swapKind: SwapKind.GivenOut,
                amountGivenScaled18: 10000000000000000000n, // 10e18
                balancesLiveScaled18: poolState.balancesLiveScaled18,
                indexIn: 1, // reserve
                indexOut: 0, // project
            });
            // mulUp(10e18, 0.1e18) = 1e18
            expect(result).toEqual(1000000000000000000n);
        });

        test('exactIn with rate = 4e18 (1 PROJECT = 4 RESERVE)', () => {
            const highRateState = {
                ...poolState,
                projectTokenRate: 4000000000000000000n, // 4e18
            } as FixedPriceLBPState;
            const highRatePool = new FixedPriceLBP(highRateState);

            // Swap 4 reserve tokens in → expect 1 project token out
            const result = highRatePool.onSwap({
                swapKind: SwapKind.GivenIn,
                amountGivenScaled18: 4000000000000000000n,
                balancesLiveScaled18: highRateState.balancesLiveScaled18,
                indexIn: 1,
                indexOut: 0,
            });
            expect(result).toEqual(1000000000000000000n);
        });

        test('blocks project token swap in', () => {
            expect(() =>
                pool.onSwap({
                    swapKind: SwapKind.GivenIn,
                    amountGivenScaled18: 1000000000000000000n,
                    balancesLiveScaled18: poolState.balancesLiveScaled18,
                    indexIn: 0, // project token as input — blocked
                    indexOut: 1,
                }),
            ).toThrow('SwapOfProjectTokenIn');
        });

        test('blocks swap when disabled', () => {
            const disabledState = {
                ...poolState,
                isSwapEnabled: false,
            } as FixedPriceLBPState;
            const disabledPool = new FixedPriceLBP(disabledState);

            expect(() =>
                disabledPool.onSwap({
                    swapKind: SwapKind.GivenIn,
                    amountGivenScaled18: 1000000000000000000n,
                    balancesLiveScaled18: disabledState.balancesLiveScaled18,
                    indexIn: 1,
                    indexOut: 0,
                }),
            ).toThrow('SwapsDisabled');
        });
    });

    describe('computeInvariant', () => {
        test('round down', () => {
            const balances = [
                50000000000000000000n, // 50 project tokens
                5000000000000000000n, // 5 reserve tokens
            ];
            // inv = 50 * 0.1 + 5 = 10
            const invariant = pool.computeInvariant(
                balances,
                Rounding.ROUND_DOWN,
            );
            expect(invariant).toEqual(10000000000000000000n);
        });

        test('round up', () => {
            const balances = [
                50000000000000000000n,
                5000000000000000000n,
            ];
            const invariant = pool.computeInvariant(
                balances,
                Rounding.ROUND_UP,
            );
            expect(invariant).toEqual(10000000000000000000n);
        });

        test('rounding difference with non-clean values', () => {
            // Use values that produce different results for mulUp vs mulDown
            const balances = [3n, 1000000000000000000n];
            const invDown = pool.computeInvariant(
                balances,
                Rounding.ROUND_DOWN,
            );
            const invUp = pool.computeInvariant(
                balances,
                Rounding.ROUND_UP,
            );
            // mulDown(3, 0.1e18) = 0, mulUp(3, 0.1e18) = 1
            expect(invDown).toEqual(1000000000000000000n);
            expect(invUp).toEqual(1000000000000000001n);
        });
    });

    describe('computeBalance', () => {
        test('throws unsupported', () => {
            expect(() => pool.computeBalance([], 0, 0n)).toThrow(
                'UnsupportedOperation',
            );
        });
    });

    describe('getMaxSwapAmount', () => {
        test('exactIn returns max reserve input based on project balance', () => {
            const maxSwapAmount = pool.getMaxSwapAmount({
                swapKind: SwapKind.GivenIn,
                balancesLiveScaled18: poolState.balancesLiveScaled18,
                tokenRates: poolState.tokenRates,
                scalingFactors: poolState.scalingFactors,
                indexIn: 1,
                indexOut: 0,
            });
            // Project balance = 100e18, rate = 0.1e18
            // maxIn = 100e18 * 0.1e18 / 1e18 = 10e18, then toRaw with sf=1, rate=1 → 10e18
            expect(maxSwapAmount).toEqual(10000000000000000000n);
        });

        test('exactOut returns output token balance in raw', () => {
            const maxSwapAmount = pool.getMaxSwapAmount({
                swapKind: SwapKind.GivenOut,
                balancesLiveScaled18: poolState.balancesLiveScaled18,
                tokenRates: poolState.tokenRates,
                scalingFactors: poolState.scalingFactors,
                indexIn: 1,
                indexOut: 0,
            });
            // Project balance = 100e18, toRaw with sf=1, rate=1 → 100e18
            expect(maxSwapAmount).toEqual(100000000000000000000n);
        });

        test('exactIn with 6 decimal reserve token', () => {
            const maxSwapAmount = pool.getMaxSwapAmount({
                swapKind: SwapKind.GivenIn,
                balancesLiveScaled18: [
                    60000000000000000000n, // project (18-dec, sf=1)
                    40000000000000000000n, // reserve (6-dec, sf=1e12)
                ],
                tokenRates: [1000000000000000000n, 1000000000000000000n],
                scalingFactors: [1n, 1000000000000n],
                indexIn: 1, // reserve (6-dec)
                indexOut: 0, // project (18-dec)
            });
            // maxIn18 = 60e18 * 0.1e18 / 1e18 = 6e18
            // toRaw: divDown(6e18, 1e12 * 1e18) = 6e18 * 1e18 / 1e30 = 6000000 (6e6)
            expect(maxSwapAmount).toEqual(6000000n);
        });
    });

    describe('invariant ratio bounds', () => {
        test('getMaximumInvariantRatio returns MAX_UINT256', () => {
            expect(pool.getMaximumInvariantRatio()).toEqual(
                115792089237316195423570985008687907853269984665640564039457584007913129639935n,
            );
        });

        test('getMinimumInvariantRatio returns 0', () => {
            expect(pool.getMinimumInvariantRatio()).toEqual(0n);
        });
    });

    describe('unsupported liquidity operations', () => {
        test('getMaxSingleTokenAddAmount throws', () => {
            expect(() => pool.getMaxSingleTokenAddAmount()).toThrow(
                'UnsupportedOperation',
            );
        });

        test('getMaxSingleTokenRemoveAmount throws', () => {
            expect(() =>
                pool.getMaxSingleTokenRemoveAmount({
                    isExactIn: true,
                    totalSupply: 1000000000000000000n,
                    tokenOutBalance: 1000000000000000000n,
                    tokenOutScalingFactor: 1000000000000000000n,
                    tokenOutRate: 1000000000000000000n,
                }),
            ).toThrow('UnsupportedOperation');
        });
    });
});

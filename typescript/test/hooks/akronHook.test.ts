// pnpm test -- akronHook.test.ts
import { describe, expect, test } from 'vitest';
import { SwapKind, SwapInput, Vault, WeightedState } from '../../src';
import { HookStateAkron } from '@/hooks/akron/akronHook';

describe('hook - akron', () => {
    const vault = new Vault();

    // "blockNumber": "30210725",
    const poolState: WeightedState = {
        poolType: 'WEIGHTED',
        hookType: 'Akron',
        poolAddress: '0x4fbb7870dbe7a7ef4866a33c0eed73d395730dc0',
        tokens: [
            '0xC768c589647798a6EE01A91FdE98EF2ed046DBD6',
            '0xe298b938631f750DD409fB18227C4a23dCdaab9b',
        ],
        scalingFactors: [1000000000000n, 1n],
        weights: [500000000000000000n, 500000000000000000n],
        swapFee: 10000000000000n,
        aggregateSwapFee: 500000000000000000n,
        balancesLiveScaled18: [4313058813293560452630n, 1641665567011677058n],
        tokenRates: [1088293475435366304n, 1026824525555904684n],
        totalSupply: 83925520418320097254n,
        supportsUnbalancedLiquidity: false,
    };

    const hookState: HookStateAkron = {
        weights: poolState.weights,
        minimumSwapFeePercentage: poolState.swapFee,
        hookType: 'Akron',
    };

    describe('should use minimum swap fee percentage', () => {
        test('tokenIn 6 decimals, GivenIn', () => {
            const swapInput: SwapInput = {
                swapKind: SwapKind.GivenIn,
                amountRaw: 10000n,
                tokenIn: '0xc768c589647798a6ee01a91fde98ef2ed046dbd6',
                tokenOut: '0xe298b938631f750DD409fB18227C4a23dCdaab9b',
            };
            const outPutAmount = vault.swap(swapInput, poolState, hookState);
            expect(outPutAmount).to.deep.eq(4034072160040n);
        });
        test('tokenIn 6 decimals, GivenOut', () => {
            const swapInput: SwapInput = {
                swapKind: SwapKind.GivenOut,
                amountRaw: 1034072160040n,
                tokenIn: '0xc768c589647798a6ee01a91fde98ef2ed046dbd6',
                tokenOut: '0xe298b938631f750DD409fB18227C4a23dCdaab9b',
            };
            const outPutAmount = vault.swap(swapInput, poolState, hookState);
            expect(outPutAmount).to.deep.eq(2564n);
        });
        test('tokenOut 6 decimals, GivenIn', () => {
            const swapInput: SwapInput = {
                swapKind: SwapKind.GivenIn,
                amountRaw: 1000000000000n,
                tokenIn: '0xe298b938631f750DD409fB18227C4a23dCdaab9b',
                tokenOut: '0xc768c589647798a6ee01a91fde98ef2ed046dbd6',
            };
            const outPutAmount = vault.swap(swapInput, poolState, hookState);
            expect(outPutAmount).to.deep.eq(2478n);
        });
        test('tokenOut 6 decimals, GivenOut', () => {
            const swapInput: SwapInput = {
                swapKind: SwapKind.GivenOut,
                amountRaw: 10000n,
                tokenIn: '0xe298b938631f750DD409fB18227C4a23dCdaab9b',
                tokenOut: '0xc768c589647798a6ee01a91fde98ef2ed046dbd6',
            };
            const outPutAmount = vault.swap(swapInput, poolState, hookState);
            expect(outPutAmount).to.deep.eq(4034173201018n);
        });
    });

    describe('should use LVRFee', () => {
        test('tokenIn 6 decimals, GivenIn', () => {
            const swapInput: SwapInput = {
                swapKind: SwapKind.GivenIn,
                amountRaw: 10000000n,
                tokenIn: '0xc768c589647798a6ee01a91fde98ef2ed046dbd6',
                tokenOut: '0xe298b938631f750DD409fB18227C4a23dCdaab9b',
            };
            const outPutAmount = vault.swap(swapInput, poolState, hookState);
            expect(outPutAmount).to.deep.eq(4013866684978601n);
        });
        test('tokenIn 6 decimals, GivenOut', () => {
            const swapInput: SwapInput = {
                swapKind: SwapKind.GivenOut,
                amountRaw: 10000000000000000n,
                tokenIn: '0xc768c589647798a6ee01a91fde98ef2ed046dbd6',
                tokenOut: '0xe298b938631f750DD409fB18227C4a23dCdaab9b',
            };
            const outPutAmount = vault.swap(swapInput, poolState, hookState);
            expect(outPutAmount).to.deep.eq(25102559n);
        });
        test('tokenOut 6 decimals, GivenIn', () => {
            const swapInput: SwapInput = {
                swapKind: SwapKind.GivenIn,
                amountRaw: 10000000000000000n,
                tokenIn: '0xe298b938631f750DD409fB18227C4a23dCdaab9b',
                tokenOut: '0xc768c589647798a6ee01a91fde98ef2ed046dbd6',
            };
            const outPutAmount = vault.swap(swapInput, poolState, hookState);
            expect(outPutAmount).to.deep.eq(24482275n);
        });
        test('tokenOut 6 decimals, GivenOut', () => {
            const swapInput: SwapInput = {
                swapKind: SwapKind.GivenOut,
                amountRaw: 100000000n,
                tokenIn: '0xe298b938631f750DD409fB18227C4a23dCdaab9b',
                tokenOut: '0xc768c589647798a6ee01a91fde98ef2ed046dbd6',
            };
            const outPutAmount = vault.swap(swapInput, poolState, hookState);
            expect(outPutAmount).to.deep.eq(42485246562777219n);
        });
    });
});

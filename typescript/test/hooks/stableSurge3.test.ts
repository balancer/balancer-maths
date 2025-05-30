// pnpm test -- stableSurge3.test.ts
import { describe, expect, test } from 'vitest';
import { StableState, SwapInput, SwapKind, Vault } from '../../src';
import { HookStateStableSurge } from '@/hooks/stableSurgeHook';

const poolState: StableState = {
    poolType: 'STABLE',
    hookType: 'StableSurge',
    poolAddress: '0x6b49054c350b47ca9aa1331ab156a1eedbe94e79',
    tokens: [
        '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
        '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    ],
    scalingFactors: [10000000000n, 1000000000000n, 1n],
    swapFee: 1000000000000000n,
    aggregateSwapFee: 500000000000000000n,
    balancesLiveScaled18: [
        48623858539800000000n,
        37690904000000000000n,
        41886483864325323440n,
    ],
    tokenRates: [
        109906780000000000000000n,
        1000000000000000000n,
        2682207000000000000000n,
    ],
    totalSupply: 150055175718346624897n,
    amp: 500000n,
    supportsUnbalancedLiquidity: true,
};

const hookState: HookStateStableSurge = {
    hookType: 'StableSurge',
    surgeThresholdPercentage: 5000000000000000n,
    maxSurgeFeePercentage: 30000000000000000n,
    amp: poolState.amp,
};

describe('hook - stableSurge', () => {
    const vault = new Vault();

    test('should match tenderly simulation', () => {
        // https://www.tdly.co/shared/simulation/350f9500-0ad1-4396-98d3-18a7f7576246
        const swapInput: SwapInput = {
            swapKind: SwapKind.GivenIn,
            amountRaw: 20000000000000000n,
            tokenIn: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
            tokenOut: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        };
        const outPutAmount = vault.swap(swapInput, poolState, hookState);
        expect(outPutAmount).to.deep.eq(37594448n);
    });
    test('should match simulation', () => {
        const swapInput: SwapInput = {
            swapKind: SwapKind.GivenOut,
            amountRaw: 37690905n,
            tokenIn: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
            tokenOut: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        };
        expect(() => vault.swap(swapInput, poolState, hookState)).to.throw(
            'tokenAmountOut is greater than the balance available in the pool',
        );
    });
});

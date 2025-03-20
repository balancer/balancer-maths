// pnpm test -- stableSurge2.test.ts
import { describe, expect, test } from 'vitest';
import { StableState, SwapInput, SwapKind, Vault } from '../../src';
import { HookStateStableSurge } from '@/hooks/stableSurgeHook';

// https://www.tdly.co/shared/simulation/382f3b29-f241-48f8-9a6f-2c58ae4c52f6
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
        2865435476013920000000n,
        2537601715000000000000n,
        3266208348800096988780n,
    ],
    tokenRates: [
        85446472000000000000000n,
        1000000000000000000n,
        2021120000000000000000n,
    ],
    totalSupply: 9332159723859490160669n,
    amp: 500000n,
    supportsUnbalancedLiquidity: true,
};

const hookState: HookStateStableSurge = {
    hookType: 'StableSurge',
    surgeThresholdPercentage: 5000000000000000n, // https://www.tdly.co/shared/simulation/c2dc8e9b-5251-44e3-b182-586fa32447cd
    maxSurgeFeePercentage: 30000000000000000n, // https://www.tdly.co/shared/simulation/f15bc9f1-9d9a-4b92-be9a-1a52b82023cf
    amp: poolState.amp,
};

describe('hook - stableSurge', () => {
    const vault = new Vault();

    test('< surgeThresholdPercentage, should use staticSwapFee', () => {
        // https://www.tdly.co/shared/simulation/32c1de43-498d-44f1-af26-0dab982c7775
        const swapInput: SwapInput = {
            swapKind: SwapKind.GivenIn,
            amountRaw: 100000000n,
            tokenIn: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
            tokenOut: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
        };
        const outPutAmount = vault.swap(swapInput, poolState, hookState);
        expect(outPutAmount).to.deep.eq(49449850642484030n);
    });
    test('> surgeThresholdPercentage, should use surge fee', () => {
        // https://www.tdly.co/shared/simulation/42cc571d-408f-47ac-a1d4-2546bee4b321
        const swapInput: SwapInput = {
            swapKind: SwapKind.GivenIn,
            amountRaw: 1000000000000000000n,
            tokenIn: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
            tokenOut: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        };
        const outPutAmount = vault.swap(swapInput, poolState, hookState);
        expect(outPutAmount).to.deep.eq(1976459205n);
    });
});

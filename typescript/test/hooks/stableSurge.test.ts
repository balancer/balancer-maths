// pnpm test -- stableSurge.test.ts
import { describe, expect, test } from 'vitest';
import { StableState, SwapInput, SwapKind, Vault } from '../../src';
import { HookStateStableSurge } from '@/hooks/stableSurgeHook';

// https://www.tdly.co/shared/simulation/eb0ae848-9c22-4852-86af-6d21e01a00c6
const poolState: StableState = {
    poolType: 'STABLE',
    hookType: 'StableSurge',
    poolAddress: '0x3ecb6d6bb37f68cac79b94701ab0e6dfa6887180',
    tokens: [
        '0xaa8e23fb1079ea71e0a56f48a2aa51851d8433d0',
        '0xff34b3d4aee8ddcd6f9afffb6fe49bd371b8a357',
    ],
    scalingFactors: [1000000000000n, 1n],
    swapFee: 1000000000000000n,
    aggregateSwapFee: 1000000000000000n,
    balancesLiveScaled18: [52110567039000000000000n, 51290874292910511112012n],
    tokenRates: [1000000000000000000n, 1000000000000000000n],
    totalSupply: 100000000000000000000000n,
    amp: 1000000n,
    supportsUnbalancedLiquidity: true,
};

const hookState: HookStateStableSurge = {
    hookType: 'StableSurge',
    surgeThresholdPercentage: 300000000000000000n,
    amp: poolState.amp,
};

describe('hook - stableSurge', () => {
    const vault = new Vault();

    test('< surgeThresholdPercentage, should use staticSwapFee', () => {
        // https://www.tdly.co/shared/simulation/65496cee-34c4-454d-a12e-75203040d60d
        const swapInput: SwapInput = {
            swapKind: SwapKind.GivenIn,
            amountRaw: 1000000n,
            tokenIn: poolState.tokens[0],
            tokenOut: poolState.tokens[1],
        };
        const outPutAmount = vault.swap(swapInput, poolState, hookState);
        expect(outPutAmount).to.deep.eq(998984155955467100n);
    });
    test('< surgeThresholdPercentage, should use staticSwapFee', () => {
        // https://www.tdly.co/shared/simulation/65496cee-34c4-454d-a12e-75203040d60d
        const swapInput: SwapInput = {
            swapKind: SwapKind.GivenIn,
            amountRaw: 7777000000n,
            tokenIn: poolState.tokens[0],
            tokenOut: poolState.tokens[1],
        };
        const outPutAmount = vault.swap(swapInput, poolState, hookState);
        expect(outPutAmount).to.deep.eq(7767900714220012463023n);
    });
    test('> surgeThresholdPercentage, should use surge fee', () => {
        // https://www.tdly.co/shared/simulation/bbab6394-b4ab-411e-a9d8-73a190f7bb8f
        const swapInput: SwapInput = {
            swapKind: SwapKind.GivenIn,
            amountRaw: 777700000000n,
            tokenIn: poolState.tokens[0],
            tokenOut: poolState.tokens[1],
        };
        const outPutAmount = vault.swap(swapInput, poolState, hookState);
        expect(outPutAmount).to.deep.eq(38944782734856534320174n);
    });
});

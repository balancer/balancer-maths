// pnpm test -- stableSurge.test.ts
import { describe, expect, test } from 'vitest';
import { StableState, SwapInput, SwapKind, Vault } from '../../src';
import { HookStateStableSurge } from '@/hooks/stableSurgeHook';

// https://www.tdly.co/shared/simulation/60dfebea-4b16-439e-b341-a5d878566493
const poolState: StableState = {
    poolType: 'STABLE',
    hookType: 'StableSurge',
    poolAddress: '0x132F4bAa39330d9062fC52d81dF72F601DF8C01f',
    tokens: [
        '0x7b79995e5f793a07bc00c21412e50ecae098e7f9',
        '0xb19382073c7a0addbb56ac6af1808fa49e377b75',
    ],
    scalingFactors: [1n, 1n],
    swapFee: 10000000000000000n,
    aggregateSwapFee: 10000000000000000n,
    balancesLiveScaled18: [10000000000000000n, 10000000000000000000n],
    tokenRates: [1000000000000000000n, 1000000000000000000n],
    totalSupply: 9079062661965173292n,
    amp: 1000000n,
    supportsUnbalancedLiquidity: true,
};

const hookState: HookStateStableSurge = {
    hookType: 'StableSurge',
    surgeThresholdPercentage: 300000000000000000n, // https://www.tdly.co/shared/simulation/e7272c42-5aab-4ddf-a65b-3737b550f41f
    maxSurgeFeePercentage: 950000000000000000n, // https://www.tdly.co/shared/simulation/efd73633-ada4-4f61-9628-e5a16b27e01b
    amp: poolState.amp,
};

describe('hook - stableSurge', () => {
    const vault = new Vault();

    test('< surgeThresholdPercentage, should use staticSwapFee', () => {
        // https://www.tdly.co/shared/simulation/e50584b3-d8ed-4633-b261-47401482c7b7
        const swapInput: SwapInput = {
            swapKind: SwapKind.GivenIn,
            amountRaw: 1000000000000000n,
            tokenIn: poolState.tokens[0],
            tokenOut: poolState.tokens[1],
        };
        const outPutAmount = vault.swap(swapInput, poolState, hookState);
        expect(outPutAmount).to.deep.eq(78522716365403684n);
    });
    test('< surgeThresholdPercentage, should use staticSwapFee', () => {
        // https://www.tdly.co/shared/simulation/1220e0ec-1d3d-4f2a-8eb0-850fed8d15ed
        const swapInput: SwapInput = {
            swapKind: SwapKind.GivenIn,
            amountRaw: 10000000000000000n,
            tokenIn: poolState.tokens[0],
            tokenOut: poolState.tokens[1],
        };
        const outPutAmount = vault.swap(swapInput, poolState, hookState);
        expect(outPutAmount).to.deep.eq(452983383563178802n);
    });
    test('> surgeThresholdPercentage, should use surge fee', () => {
        // https://www.tdly.co/shared/simulation/ce2a1146-68d4-49fc-b9d2-1fbc22086ea5
        const swapInput: SwapInput = {
            swapKind: SwapKind.GivenIn,
            amountRaw: 8000000000000000000n,
            tokenIn: poolState.tokens[1],
            tokenOut: poolState.tokens[0],
        };
        const outPutAmount = vault.swap(swapInput, poolState, hookState);
        expect(outPutAmount).to.deep.eq(3252130027531260n);
    });
});

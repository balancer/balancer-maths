// pnpm test -- exitFee.test.ts
import { describe, expect, test } from 'vitest';
import { SwapKind, SwapInput, PoolState, Vault } from '../../src';
import { HookStateAkronWeightedLVRFee } from '@/hooks/akronWeightedLVRFeeHookCompex';

const poolState = {
    poolType: 'WEIGHTED',
    hookType: 'AkronWeightedLVRFee',
    chainId: '11155111',
    blockNumber: '5955145',
    poolAddress: '0x03722034317d8fb16845213bd3ce15439f9ce136',
    tokens: [
        '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9',
        '0xb19382073c7A0aDdbb56Ac6AF1808Fa49e377B75',
    ],
    scalingFactors: [1n, 1n],
    weights: [500000000000000000n, 500000000000000000n],
    swapFee: 1000000000000n, // 0.001%
    aggregateSwapFee: 0n,
    balancesLiveScaled18: [100000000000000000n, 100000000000000000n],
    tokenRates: [1000000000000000000n, 1000000000000000000n],
    totalSupply: 158113883008415798n,
    supportsUnbalancedLiquidity: false,
};

const hookState: HookStateAkronWeightedLVRFee = {
    weights: poolState.weights,
    minimumSwapFeePercentage: poolState.swapFee,
};


describe('hook - akronWeightedLVRFee', () => {
    const vault = new Vault();

    test('< minimum swap fee percentage, should use minimum swap fee percentage of 0.001%', () => {
        const swapInput: SwapInput = {
            swapKind: SwapKind.GivenIn,
            amountRaw: 10000n,
            tokenIn: poolState.tokens[0],
            tokenOut: poolState.tokens[1],
        };
        const outPutAmount = vault.swap(swapInput, poolState, hookState);
        expect(outPutAmount).to.deep.eq(9970n);
    });
    test('< minimum swap fee percentage, should use LVRFee', () => {
        const swapInput: SwapInput = {
            swapKind: SwapKind.GivenIn,
            amountRaw: 1000000000000000n,
            tokenIn: poolState.tokens[0],
            tokenOut: poolState.tokens[1],
        };
        const outPutAmount = vault.swap(swapInput, poolState, hookState);
        expect(outPutAmount).to.deep.eq(980392156862745n);
    });
    test('> minimum swap fee percentage, should use LVRFee', () => {
        
        const swapInput: SwapInput = {
            swapKind: SwapKind.GivenOut,
            amountRaw: 980392156862745n,
            tokenIn: poolState.tokens[0],
            tokenOut: poolState.tokens[1],
        };
        const outPutAmount = vault.swap(swapInput, poolState, hookState);
        expect(outPutAmount).to.deep.eq(1000000000000000n);
    });
});

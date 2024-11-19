// pnpm test -- directionalFee.test.ts
import { describe, expect, test } from 'vitest';
import { SwapKind, Vault, SwapInput } from '../../src';
import { DirectionalFeeHook, HookStateDirectionalFee } from '../../src/hooks/directionalFeeHook';


const poolBalancesScaled18 = [5000000000000000000n, 5000000000000000000n];
const swapAmountRaw = 1000000000000000n;
const staticSwapFeePercentage = 100000000000000n; // 0.01%
const poolTokens = ['0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9', '0xb19382073c7A0aDdbb56Ac6AF1808Fa49e377B75'];

const hookState : HookStateDirectionalFee = {
    tokens: poolTokens,
    balancesLiveScaled18: poolBalancesScaled18,
}

const poolStateWithHook = {
    poolType: 'WEIGHTED',
    hookType: 'DirectionalFee',
    chainId: '11155111',
    blockNumber: '5955145',
    poolAddress: '0x03722034317d8fb16845213bd3ce15439f9ce136',
    tokens: poolTokens,
    scalingFactors: [1000000000000000000n, 1000000000000000000n],
    swapFee: staticSwapFeePercentage,
    balancesLiveScaled18: poolBalancesScaled18,
    tokenRates: [1000000000000000000n, 1000000000000000000n],
    totalSupply: 158113883008415798n,
    aggregateSwapFee: 0n,
    weights: [500000000000000000n, 500000000000000000n],

}

const poolStateWithoutHook = {
    poolType: 'WEIGHTED',
    chainId: '11155111',
    blockNumber: '5955145',
    poolAddress: '0x03722034317d8fb16845213bd3ce15439f9ce136',
    tokens: poolTokens,
    scalingFactors: [1000000000000000000n, 1000000000000000000n],
    swapFee: staticSwapFeePercentage,
    balancesLiveScaled18: poolBalancesScaled18,
    tokenRates: [1000000000000000000n, 1000000000000000000n],
    totalSupply: 158113883008415798n,
    aggregateSwapFee: 0n,
    weights: [500000000000000000n, 500000000000000000n],
}

const swapParams : SwapInput = {
    swapKind: SwapKind.GivenIn,
    amountRaw: swapAmountRaw,
    tokenIn: poolTokens[0], 
    tokenOut: poolTokens[1],
};

describe('hook - directionalFee', () => {
    const vault = new Vault();
    const hook = new DirectionalFeeHook();

    test('computes directional fee', () => {
        // change poolStateWithHook to have no swap fees. 
        const { success, dynamicSwapFee } = hook.onComputeDynamicSwapFee(swapParams, 0n, hookState);
        expect(success).toBe(true);
        expect(dynamicSwapFee).toBeGreaterThan(0n);
    })
    test('uses static swap fee when directional fee is not applicable', () => {
        // set swap amount so that dynamic swap fee is lower and static one gets used instead
        const newSwapParams = {
            ...swapParams,
            amountRaw: swapAmountRaw / 10000000000000n,
        }
        const { success, dynamicSwapFee } = hook.onComputeDynamicSwapFee(newSwapParams, staticSwapFeePercentage, hookState);
        expect(success).toBe(true);
        expect(dynamicSwapFee).toEqual(staticSwapFeePercentage);
    })
    test('it uses dynamic swap fee with high enough swap amount', () => {
        // swap amount is big enough to trigger dynamic swap fee
        const { success, dynamicSwapFee } = hook.onComputeDynamicSwapFee(swapParams, staticSwapFeePercentage, hookState);
        expect(success).toBe(true);
        expect(dynamicSwapFee).toBeGreaterThan(staticSwapFeePercentage);
    })

    test('directionalFee higher than static swap fee', () => {
        // this one triggers the dynamic swap fee computation & usage
        const newSwapInput = {
            ...swapParams,
            swapInput: poolBalancesScaled18[0] / 10n,
        };

        const outputAmountWithHook = vault.swap(
            newSwapInput,
            poolStateWithHook,
            hookState
        )

        // since no hook is part of the pool state, the vault should
        // not compute the onDymamicSwapFee logic and should go with the
        // static swap fee percentage.
        const outputAmountWithoutHook = vault.swap(
            newSwapInput,
            poolStateWithoutHook,
            hookState
        )
        expect(outputAmountWithHook).toBeLessThan(outputAmountWithoutHook);
    })
})
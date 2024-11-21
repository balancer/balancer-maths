// pnpm test -- directionalFee.test.ts
import { describe, expect, test } from 'vitest';
import { SwapKind, Vault, SwapInput, PoolState } from '../../src';
import { DirectionalFeeHook, HookStateDirectionalFee } from '../../src/hooks/directionalFeeHook';


const poolBalancesScaled18 = [20000000000000000000000n, 20000000000000000000000n];
const swapAmountRaw = 100000000n;
const staticSwapFeePercentage = 1000000000000000n; // 0.1%
const poolTokens = [
    {
        address: '0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0',
        decimals: 6n,
        index: 0n
    },
    {
        address: '0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357',
        decimals: 18n,
        index: 1n
    }];

const scalingFactors = [1000000000000n, 1n];
const totalSupply = 40000000000000000000000n;

const hookState: HookStateDirectionalFee = {
    tokens: poolTokens,
    balancesLiveScaled18: poolBalancesScaled18,
};

const stablePoolStateWithHook: PoolState = {
    poolType: 'STABLE',
    hookType: 'DirectionalFee',
    tokens: poolTokens.map(token => token.address),
    scalingFactors: scalingFactors,
    tokenRates: [1000000000000000000n, 1000000000000000000n],
    balancesLiveScaled18: poolBalancesScaled18,
    swapFee: staticSwapFeePercentage,
    aggregateSwapFee: 0n,
    totalSupply: totalSupply,
    amp: 10000n,
    hookState: hookState,
};

const stablePoolStateWithoutHook: PoolState = {
    poolType: 'STABLE',
    tokens: poolTokens.map(token => token.address),
    scalingFactors: scalingFactors,
    tokenRates: [1000000000000000000n, 1000000000000000000n],
    balancesLiveScaled18: poolBalancesScaled18,
    swapFee: staticSwapFeePercentage,
    aggregateSwapFee: 0n,
    totalSupply: totalSupply,
    amp: 10000n,
    hookState: hookState,
};

const swapParams : SwapInput = {
    swapKind: SwapKind.GivenIn,
    amountRaw: swapAmountRaw,
    tokenIn: poolTokens[0].address, 
    tokenOut: poolTokens[1].address,
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
    test('it uses dynamic swap fee with high enough swap amount - given out', () => {
        // swap amount is big enough to trigger dynamic swap fee
        const { success, dynamicSwapFee } = hook.onComputeDynamicSwapFee(swapParams, staticSwapFeePercentage, hookState);
        expect(success).toBe(true);
        expect(dynamicSwapFee).toBeGreaterThan(staticSwapFeePercentage);
        // based on this simulation https://dashboard.tenderly.co/mcquardt/project/simulator/3e0f9953-f1f7-4936-b083-cbd2958bd801?trace=0.1.0.2.2.0.3.18 
        expect(dynamicSwapFee).toEqual(5000000000000000n);
    })

    test('directionalFee higher than static swap fee', () => {
        // based on this simulation https://dashboard.tenderly.co/mcquardt/project/simulator/3e0f9953-f1f7-4936-b083-cbd2958bd801?trace=0.1.0.2.2.0.3.18 
        const outputAmountWithHook = vault.swap(
            swapParams,
            stablePoolStateWithHook,
            hookState
        )
        expect(outputAmountWithHook).toEqual(99499505472260433154n);

        // since no hook is part of the pool state, the vault should
        // not compute the onDymamicSwapFee logic and should go with the
        // static swap fee percentage.
        const outputAmountWithoutHook = vault.swap(
            swapParams,
            stablePoolStateWithoutHook,
            hookState
        )
        // This must always hold, otherwise the hook is wrongly implemented
        expect(outputAmountWithHook).toBeLessThan(outputAmountWithoutHook);

    })
    test('directional fee lower than static swap fee - given in ', () => {
        // due to swap amount, the dynamic swap fee is lower than the static swap fee
        // so the vault will use the static swap fee percentage to calculate the swap
        // https://dashboard.tenderly.co/mcquardt/project/simulator/a4b17794-6eef-4f21-8eee-1297bc280ddd?trace=0.1.0.2.2.0.3.21

        const swapParamsWithLowerAmountIn = {
            ...swapParams,
            amountRaw: 1000000n
        }

        const { success, dynamicSwapFee } = hook.onComputeDynamicSwapFee(swapParamsWithLowerAmountIn, staticSwapFeePercentage, hookState);
        expect(success).toBe(true);
        expect(dynamicSwapFee).toEqual(1000000000000000n);

        const outputAmountWithHook = vault.swap(
            swapParamsWithLowerAmountIn,
            stablePoolStateWithHook,
            hookState
        )
        expect(outputAmountWithHook).toEqual(998999950149802562n);
    })
})
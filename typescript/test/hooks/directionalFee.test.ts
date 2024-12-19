// pnpm test -- directionalFee.test.ts
import { describe, expect, test } from 'vitest';
import { SwapKind, Vault, SwapInput, SwapParams, StableState } from '../../src';
import { DirectionalFeeHook } from '../../src/hooks/directionalFeeHook';

const poolBalancesScaled18 = [
    20000000000000000000000n,
    20000000000000000000000n,
];
const swapAmountRaw = 100000000n;
const swapAmountScaled18 = 100000000000000000000n;
const staticSwapFeePercentage = 1000000000000000n; // 0.1%
const poolTokens = [
    {
        address: '0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0',
        decimals: 6n,
        index: 0n,
    },
    {
        address: '0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357',
        decimals: 18n,
        index: 1n,
    },
];

const scalingFactors = [1000000000000n, 1n];
const totalSupply = 40000000000000000000000n;

const stablePoolStateWithHook: StableState = {
    poolAddress: '0xb4cd36aba5d75feb6bf2b8512dbf8fbd8add3656',
    poolType: 'STABLE',
    hookType: 'DirectionalFee',
    tokens: poolTokens.map((token) => token.address),
    scalingFactors: scalingFactors,
    tokenRates: [1000000000000000000n, 1000000000000000000n],
    balancesLiveScaled18: poolBalancesScaled18,
    swapFee: staticSwapFeePercentage,
    aggregateSwapFee: 0n,
    totalSupply: totalSupply,
    amp: 1000000n,
    supportsUnbalancedLiquidity: true,
};

const stablePoolStateWithoutHook: StableState = {
    poolAddress: '0xb4cd36aba5d75feb6bf2b8512dbf8fbd8add3656',
    poolType: 'STABLE',
    tokens: poolTokens.map((token) => token.address),
    scalingFactors: scalingFactors,
    tokenRates: [1000000000000000000n, 1000000000000000000n],
    balancesLiveScaled18: poolBalancesScaled18,
    swapFee: staticSwapFeePercentage,
    aggregateSwapFee: 0n,
    totalSupply: totalSupply,
    amp: 1000000n,
    supportsUnbalancedLiquidity: true,
};

const swapInput: SwapInput = {
    swapKind: SwapKind.GivenIn,
    amountRaw: swapAmountRaw,
    tokenIn: poolTokens[0].address,
    tokenOut: poolTokens[1].address,
};

const swapParams: SwapParams = {
    swapKind: SwapKind.GivenIn,
    amountGivenScaled18: swapAmountScaled18,
    balancesLiveScaled18: poolBalancesScaled18,
    indexIn: 0,
    indexOut: 1,
};

describe('hook - directionalFee', () => {
    const vault = new Vault();
    const hook = new DirectionalFeeHook();

    test('computes directional fee', () => {
        // change poolStateWithHook to have no swap fees.
        const { success, dynamicSwapFee } = hook.onComputeDynamicSwapFee(
            swapParams,
            stablePoolStateWithHook.poolAddress,
            0n,
        );
        expect(success).toBe(true);
        expect(dynamicSwapFee).toBeGreaterThan(0n);
    });
    test('uses static swap fee when directional fee is not applicable', () => {
        // set swap amount so that dynamic swap fee is lower and static one gets used instead
        const newSwapParams = {
            ...swapParams,
            amountGivenScaled18: 1n,
        };
        const { success, dynamicSwapFee } = hook.onComputeDynamicSwapFee(
            newSwapParams,
            stablePoolStateWithHook.poolAddress,
            staticSwapFeePercentage,
        );
        expect(success).toBe(true);
        expect(dynamicSwapFee).toEqual(staticSwapFeePercentage);
    });
    test('it uses dynamic swap fee with high enough swap amount - given out', () => {
        // swap amount is big enough to trigger dynamic swap fee
        const { success, dynamicSwapFee } = hook.onComputeDynamicSwapFee(
            swapParams,
            stablePoolStateWithHook.poolAddress,
            staticSwapFeePercentage,
        );
        expect(success).toBe(true);
        expect(dynamicSwapFee).toBeGreaterThan(staticSwapFeePercentage);
        // based on this simulation https://dashboard.tenderly.co/mcquardt/project/simulator/3e0f9953-f1f7-4936-b083-cbd2958bd801?trace=0.1.0.2.2.0.3.18
        expect(dynamicSwapFee).toEqual(5000000000000000n);
    });

    test('directional fee higher than static swap fee - given in', () => {
        // based on this simulation https://dashboard.tenderly.co/mcquardt/project/simulator/3e0f9953-f1f7-4936-b083-cbd2958bd801?trace=0.1.0.2.2.0.3.18
        const outputAmountWithHook = vault.swap(
            swapInput,
            stablePoolStateWithHook,
            {},
        );
        expect(outputAmountWithHook).toEqual(99499505472260433154n);

        // since no hook is part of the pool state, the vault should
        // not compute the onDymamicSwapFee logic and should go with the
        // static swap fee percentage.
        const outputAmountWithoutHook = vault.swap(
            swapInput,
            stablePoolStateWithoutHook,
            {},
        );
        // This must always hold, otherwise the hook is wrongly implemented
        expect(outputAmountWithHook).toBeLessThan(outputAmountWithoutHook);
    });
    test('directional fee lower than static swap fee - given in ', () => {
        // due to swap amount, the dynamic swap fee is lower than the static swap fee
        // so the vault will use the static swap fee percentage to calculate the swap
        // https://dashboard.tenderly.co/mcquardt/project/simulator/a4b17794-6eef-4f21-8eee-1297bc280ddd?trace=0.1.0.2.2.0.3.21

        const swapParamsWithLowerAmountIn = {
            ...swapInput,
            amountRaw: 1000000n,
        };

        const { success, dynamicSwapFee } = hook.onComputeDynamicSwapFee(
            { ...swapParams, amountGivenScaled18: 1000000000000000000n },
            stablePoolStateWithHook.poolAddress,
            staticSwapFeePercentage,
        );
        expect(success).toBe(true);
        expect(dynamicSwapFee).toEqual(1000000000000000n);

        const outputAmountWithHook = vault.swap(
            swapParamsWithLowerAmountIn,
            stablePoolStateWithHook,
            {},
        );
        expect(outputAmountWithHook).toEqual(998999950149802562n);
    });
    test('directional fee lower than static swap fee - given out', () => {
        // with 1 DAI out, the dynamic swap fee hook does not get triggered
        // therefore the direction fee is lower than the static swap fee
        // and the static swap fee is being charged by the vault
        // sim: https://dashboard.tenderly.co/mcquardt/project/simulator/06bc1601-1987-4a9a-99cb-e565bb57218d
        const swapParamsGivenOut = {
            ...swapInput,
            amountRaw: 1000000000000000000n,
            swapKind: SwapKind.GivenOut,
        };
        const amountIn = vault.swap(
            swapParamsGivenOut,
            stablePoolStateWithHook,
            {},
        );
        expect(amountIn).toEqual(1001002n);
    });
    test('directional fee higher than static swap fee - given out', () => {
        // with 100 DAI out, the dynamic swap fee hook does get triggered
        // sim: https://dashboard.tenderly.co/mcquardt/project/simulator/571c3a06-d969-43fd-b4b8-08833b9c0997?trace=0.1.0.2.2.0.3.21.0
        const swapParamsGivenOut = {
            ...swapInput,
            amountRaw: 100000000000000000000n,
            swapKind: SwapKind.GivenOut,
        };
        const amountIn = vault.swap(
            swapParamsGivenOut,
            stablePoolStateWithHook,
            {},
        );
        expect(amountIn).toEqual(100503015n);
    });
});

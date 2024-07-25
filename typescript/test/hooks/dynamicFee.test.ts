// pnpm test -- dynamicFee.test.ts
import { describe, expect, test } from 'vitest';
import { SwapInput, SwapKind, Vault, Weighted } from '../../src';
import { HookBase, HookState } from '@/hooks/types';

const pool = {
    poolType: 'CustomPool',
    hookType: 'CustomHook',
    chainId: '11155111',
    blockNumber: '5955145',
    poolAddress: '0xb2456a6f51530053bc41b0ee700fe6a2c37282e8',
    tokens: [
        '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9',
        '0xb19382073c7A0aDdbb56Ac6AF1808Fa49e377B75',
    ],
    scalingFactors: [1000000000000000000n, 1000000000000000000n],
    weights: [500000000000000000n, 500000000000000000n],
    swapFee: 0n,

    aggregateSwapFee: 500000000000000000n,
    balancesLiveScaled18: [2000000000000000000n, 2000000000000000000n],
    tokenRates: [1000000000000000000n, 1000000000000000000n],
    totalSupply: 1000000000000000000n,
};

const swapInput = {
    swapKind: SwapKind.GivenIn,
    amountRaw: 100000000000000n,
    tokenIn: pool.tokens[0],
    tokenOut: pool.tokens[1],
};

describe('hook - dynamicFee', () => {
    const vault = new Vault({
        customPoolClasses: {
            CustomPool: CustomPool,
        },
        customHookClasses: {
            CustomHook: CustomHook,
        },
    });

    test('should use dynamicFee set by hook', () => {
        /*
            hook state is used to pass new swapFee which gives expected swap result
        */
        const inputHookState = {
            newSwapFee: 100000000000000000n,
        };
        const test = vault.swap(swapInput, pool, inputHookState);
        expect(test).to.eq(89995500224987n);
    });
});

class CustomPool extends Weighted {}

class CustomHook implements HookBase {
    public shouldCallComputeDynamicSwapFee = true;
    public shouldCallBeforeSwap = false;
    public shouldCallAfterSwap = false;
    public shouldCallBeforeAddLiquidity = false;
    public shouldCallAfterAddLiquidity = false;
    public shouldCallBeforeRemoveLiquidity = false;
    public shouldCallAfterRemoveLiquidity = false;
    public enableHookAdjustedAmounts = false;

    onBeforeAddLiquidity() {
        return { success: false, hookAdjustedBalancesScaled18: [] };
    }
    onAfterAddLiquidity() {
        return { success: false, hookAdjustedAmountsInRaw: [] };
    }
    onBeforeRemoveLiquidity() {
        return { success: false, hookAdjustedBalancesScaled18: [] };
    }
    onAfterRemoveLiquidity() {
        return {
            success: false,
            hookAdjustedAmountsOutRaw: [],
        };
    }
    onBeforeSwap() {
        return { success: false, hookAdjustedBalancesScaled18: [] };
    }
    onAfterSwap() {
        return { success: false, hookAdjustedAmountCalculatedRaw: 0n };
    }
    onComputeDynamicSwapFee(
        params: SwapInput,
        staticSwapFeePercentage: bigint,
        hookState: HookState | unknown,
    ) {
        if (
            !(
                typeof hookState === 'object' &&
                hookState !== null &&
                'newSwapFee' in hookState
            )
        )
            throw new Error('Unexpected hookState');
        expect(params.swapKind).to.eq(swapInput.swapKind);
        expect(params.tokenIn).to.eq(swapInput.tokenIn);
        expect(params.tokenOut).to.eq(swapInput.tokenOut);
        expect(params.amountRaw).to.eq(swapInput.amountRaw);
        expect(staticSwapFeePercentage).to.eq(pool.swapFee);
        return {
            success: true,
            dynamicSwapFee: hookState.newSwapFee as bigint,
        };
    }
}

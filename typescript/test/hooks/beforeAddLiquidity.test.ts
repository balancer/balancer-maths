// pnpm test -- beforeAddLiquidity.test.ts
import { describe, expect, test } from 'vitest';
import { AddKind, Vault, Weighted } from '../../src';
import { HookBase, HookState } from '@/hooks/types';

const addLiquidityInput = {
    pool: '0xb2456a6f51530053bc41b0ee700fe6a2c37282e8',
    maxAmountsIn: [200000000000000000n, 100000000000000000n],
    minBptAmountOut: 0n,
    kind: AddKind.UNBALANCED,
};

class CustomPool extends Weighted {}

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
    swapFee: 100000000000000000n,
    aggregateSwapFee: 500000000000000000n,
    balancesLiveScaled18: [2000000000000000000n, 2000000000000000000n],
    tokenRates: [1000000000000000000n, 1000000000000000000n],
    totalSupply: 1000000000000000000n,
};

describe('hook - beforeAddLiquidity', () => {
    const vault = new Vault({
        customPoolClasses: {
            CustomPool: CustomPool,
        },
        customHookClasses: {
            CustomHook: CustomHook,
        },
    });

    test('should alter pool balances', () => {
        /*
            hook state is used to pass new balances which give expected bptAmount out
        */
        const inputHookState = {
            balanceChange: [1000000000000000000n, 1000000000000000000n],
        };
        const test = vault.addLiquidity(
            addLiquidityInput,
            pool,
            inputHookState,
        );
        expect(test.amountsIn).to.deep.eq([
            200000000000000000n,
            100000000000000000n,
        ]);
        expect(test.bptAmountOut).to.deep.eq(146464294351915965n);
    });
});

class CustomHook implements HookBase {
    public shouldCallComputeDynamicSwapFee = false;
    public shouldCallBeforeSwap = false;
    public shouldCallAfterSwap = false;
    public shouldCallBeforeAddLiquidity = true;
    public shouldCallAfterAddLiquidity = false;
    public shouldCallBeforeRemoveLiquidity = false;
    public shouldCallAfterRemoveLiquidity = false;
    public enableHookAdjustedAmounts = false;

    onBeforeAddLiquidity(
        kind: AddKind,
        maxAmountsInScaled18: bigint[],
        minBptAmountOut: bigint,
        balancesScaled18: bigint[],
        hookState: HookState | unknown,
    ) {
        if (
            !(
                typeof hookState === 'object' &&
                hookState !== null &&
                'balanceChange' in hookState
            )
        )
            throw new Error('Unexpected hookState');
        expect(kind).to.eq(addLiquidityInput.kind);
        expect(maxAmountsInScaled18).to.deep.eq(addLiquidityInput.maxAmountsIn);
        expect(minBptAmountOut).to.deep.eq(addLiquidityInput.minBptAmountOut);
        expect(balancesScaled18).to.deep.eq(pool.balancesLiveScaled18);
        return {
            success: true,
            hookAdjustedBalancesScaled18: hookState.balanceChange as bigint[],
        };
    }
    onAfterAddLiquidity() {
        return {
            success: false,
            hookAdjustedAmountsInRaw: [],
        };
    }
    onBeforeRemoveLiquidity() {
        return {
            success: true,
            hookAdjustedBalancesScaled18: [],
        };
    }
    onAfterRemoveLiquidity() {
        return { success: false, hookAdjustedAmountsOutRaw: [] };
    }
    onBeforeSwap() {
        return { success: false, hookAdjustedBalancesScaled18: [] };
    }
    onAfterSwap() {
        return { success: false, hookAdjustedAmountCalculatedRaw: 0n };
    }
    onComputeDynamicSwapFee() {
        return { success: false, dynamicSwapFee: 0n };
    }
}

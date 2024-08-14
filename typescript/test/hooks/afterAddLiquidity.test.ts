// pnpm test -- afterAddLiquidity.test.ts
import { describe, expect, test } from 'vitest';
import { AddKind, Vault, Weighted } from '../../src';
import { HookBase, HookState } from '@/hooks/types';

const addLiquidityInput = {
    pool: '0xb2456a6f51530053bc41b0ee700fe6a2c37282e8',
    maxAmountsInRaw: [200000000000000000n, 100000000000000000n],
    minBptAmountOutRaw: 0n,
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
    balancesLiveScaled18: [1000000000000000000n, 1000000000000000000n],
    tokenRates: [1000000000000000000n, 1000000000000000000n],
    totalSupply: 1000000000000000000n,
};

describe('hook - afterAddLiquidity', () => {
    const vault = new Vault({
        customPoolClasses: {
            CustomPool: CustomPool,
        },
        customHookClasses: {
            CustomHook: CustomHook,
        },
    });

    test('aggregateSwapFee of 0 should not take any protocol fees from updated balances', () => {
        // hook state is used to pass expected value to tests
        const inputHookState = {
            expectedBalancesLiveScaled18: [
                1200000000000000000n,
                1100000000000000000n,
            ],
        };
        const test = vault.addLiquidity(
            addLiquidityInput,
            {
                ...pool,
                aggregateSwapFee: 0n,
            },
            inputHookState,
        );
        // Hook adds 1n to amountsIn
        expect(test.amountsInRaw).to.deep.eq([
            200000000000000001n,
            100000000000000001n,
        ]);
        expect(test.bptAmountOutRaw).to.deep.eq(146464294351915965n);
    });

    test('aggregateSwapFee of 50% should take half of remaining', () => {
        /*
            hook state is used to pass expected value to tests
            aggregate fee amount is 2554373534619714n which is deducted from amount in
        */
        const inputHookState = {
            expectedBalancesLiveScaled18: [
                1197445626465380286n,
                1100000000000000000n,
            ],
        };
        const test = vault.addLiquidity(
            addLiquidityInput,
            pool,
            inputHookState,
        );
        expect(test.amountsInRaw).to.deep.eq([
            200000000000000001n,
            100000000000000001n,
        ]);
        expect(test.bptAmountOutRaw).to.deep.eq(146464294351915965n);
    });
});

class CustomHook implements HookBase {
    public shouldCallComputeDynamicSwapFee = false;
    public shouldCallBeforeSwap = false;
    public shouldCallAfterSwap = false;
    public shouldCallBeforeAddLiquidity = false;
    public shouldCallAfterAddLiquidity = true;
    public shouldCallBeforeRemoveLiquidity = false;
    public shouldCallAfterRemoveLiquidity = false;
    public enableHookAdjustedAmounts = true;

    onBeforeAddLiquidity() {
        return { success: false, hookAdjustedBalancesScaled18: [] };
    }
    onAfterAddLiquidity(
        kind: AddKind,
        amountsInScaled18: bigint[],
        amountsInRaw: bigint[],
        bptAmountOut: bigint,
        balancesScaled18: bigint[],
        hookState: HookState | unknown,
    ) {
        if (
            !(
                typeof hookState === 'object' &&
                hookState !== null &&
                'expectedBalancesLiveScaled18' in hookState
            )
        )
            throw new Error('Unexpected hookState');
        expect(kind).to.eq(addLiquidityInput.kind);
        expect(bptAmountOut).to.eq(146464294351915965n);
        expect(amountsInScaled18).to.deep.eq(addLiquidityInput.maxAmountsInRaw);
        expect(amountsInRaw).to.deep.eq(addLiquidityInput.maxAmountsInRaw);
        expect(balancesScaled18).to.deep.eq(
            hookState.expectedBalancesLiveScaled18,
        );
        return {
            success: true,
            hookAdjustedAmountsInRaw: [
                amountsInRaw[0] + 1n,
                amountsInRaw[1] + 1n,
            ],
        };
    }
    onBeforeRemoveLiquidity() {
        return { success: false, hookAdjustedBalancesScaled18: [] };
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

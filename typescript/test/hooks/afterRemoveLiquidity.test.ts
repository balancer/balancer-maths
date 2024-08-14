// pnpm test -- afterRemoveLiquidity.test.ts
import { describe, expect, test } from 'vitest';
import { RemoveKind, Vault, type PoolBase } from '../../src';
import { HookBase, HookState } from '@/hooks/types';

const removeLiquidityInput = {
    pool: '0xb2456a6f51530053bc41b0ee700fe6a2c37282e8',
    minAmountsOutRaw: [0n, 1n],
    maxBptAmountInRaw: 100000000000000000n,
    kind: RemoveKind.SINGLE_TOKEN_EXACT_IN,
};

/*
remove:
    SINGLE_TOKEN_EXACT_IN:
    bptAmountIn: 100000000000000000n
    returns:
        amountsOutScaled18: [ 0n, 909999999999999999n ]
        amountsOutRaw: [ 0n, 909999999999999999n ]
*/
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

describe('hook - afterRemoveLiquidity', () => {
    const vault = new Vault({
        customPoolClasses: {
            CustomPool: CustomPool,
        },
        customHookClasses: {
            CustomHook: CustomHook,
        },
    });

    test('aggregateSwapFee of 0 should not take any protocol fees from updated balances', () => {
        /*
            hook state is used to pass expected value to tests
            Original balance is 1
            Amount out is 0.9099...
            Leaves 0.090000000000000001
            Swap fee amount is: 0.09 which is all left in pool because aggregateFee is 0
        */
        const inputHookState = {
            expectedBalancesLiveScaled18: [
                1000000000000000000n,
                90000000000000001n,
            ],
        };
        const test = vault.removeLiquidity(
            removeLiquidityInput,
            {
                ...pool,
                aggregateSwapFee: 0n,
            },
            inputHookState,
        );
        expect(test.bptAmountInRaw).to.eq(
            removeLiquidityInput.maxBptAmountInRaw,
        );
        expect(test.amountsOutRaw).to.deep.eq([0n, 0n]);
    });

    test('aggregateSwapFee of 50% should take half of remaining', () => {
        /*
            hook state is used to pass expected value to tests
            Original balance is 1
            Amount out is 0.9099...
            Leaves 0.090000000000000001
            Swap fee amount is: 0.09
            Aggregate fee amount is 50% of swap fee: 0.045
            Leaves 0.045000000000000001 in pool
        */
        const inputHookState = {
            expectedBalancesLiveScaled18: [
                1000000000000000000n,
                45000000000000001n,
            ],
        };
        const test = vault.removeLiquidity(
            removeLiquidityInput,
            pool,
            inputHookState,
        );
        expect(test.bptAmountInRaw).to.eq(
            removeLiquidityInput.maxBptAmountInRaw,
        );
        expect(test.amountsOutRaw).to.deep.eq([0n, 0n]);
    });
});

class CustomPool implements PoolBase {
    constructor() {}

    getMaxSwapAmount(): bigint {
        return 1n;
    }

    getMaxSingleTokenRemoveAmount() {
        return 1n;
    }
    getMaxSingleTokenAddAmount() {
        return 1n;
    }

    onSwap(): bigint {
        return 1n;
    }
    computeInvariant(): bigint {
        return 1n;
    }
    computeBalance(): bigint {
        return 1n;
    }
}

class CustomHook implements HookBase {
    public shouldCallComputeDynamicSwapFee = false;
    public shouldCallBeforeSwap = false;
    public shouldCallAfterSwap = false;
    public shouldCallBeforeAddLiquidity = false;
    public shouldCallAfterAddLiquidity = false;
    public shouldCallBeforeRemoveLiquidity = false;
    public shouldCallAfterRemoveLiquidity = true;
    public enableHookAdjustedAmounts = true;

    onBeforeAddLiquidity() {
        return { success: false, hookAdjustedBalancesScaled18: [] };
    }
    onAfterAddLiquidity() {
        return { success: false, hookAdjustedAmountsInRaw: [] };
    }
    onBeforeRemoveLiquidity() {
        return { success: false, hookAdjustedBalancesScaled18: [] };
    }
    onAfterRemoveLiquidity(
        kind: RemoveKind,
        bptAmountIn: bigint,
        amountsOutScaled18: bigint[],
        amountsOutRaw: bigint[],
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
        expect(kind).to.eq(removeLiquidityInput.kind);
        expect(bptAmountIn).to.eq(removeLiquidityInput.maxBptAmountInRaw);
        expect(amountsOutScaled18).to.deep.eq([0n, 909999999999999999n]);
        expect(amountsOutRaw).to.deep.eq([0n, 909999999999999999n]);
        expect(balancesScaled18).to.deep.eq(
            hookState.expectedBalancesLiveScaled18,
        );
        return {
            success: true,
            hookAdjustedAmountsOutRaw: new Array(
                amountsOutScaled18.length,
            ).fill(0n),
        };
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

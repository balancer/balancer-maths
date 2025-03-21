// pnpm test -- beforeRemoveLiquidity.test.ts
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
    scalingFactors: [1n, 1n],
    weights: [500000000000000000n, 500000000000000000n],
    swapFee: 100000000000000000n,
    aggregateSwapFee: 500000000000000000n,
    balancesLiveScaled18: [2000000000000000000n, 2000000000000000000n],
    tokenRates: [1000000000000000000n, 1000000000000000000n],
    totalSupply: 1000000000000000000n,
    supportsUnbalancedLiquidity: true,
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

    test('should alter pool balances', () => {
        /*
            hook state is used to pass new balances which give expected result
        */
        const inputHookState = {
            balanceChange: [1000000000000000000n, 1000000000000000000n],
        };
        const test = vault.removeLiquidity(
            removeLiquidityInput,
            pool,
            inputHookState,
        );
        expect(test.bptAmountInRaw).to.eq(
            removeLiquidityInput.maxBptAmountInRaw,
        );
        expect(test.amountsOutRaw).to.deep.eq([0n, 909999999999999999n]);
    });
});

class CustomPool implements PoolBase {
    constructor() {}

    getMaxSwapAmount(): bigint {
        return 1n;
    }

    getMinimumInvariantRatio(): bigint {
        return 1n;
    }

    getMaximumInvariantRatio(): bigint {
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
    public shouldCallBeforeRemoveLiquidity = true;
    public shouldCallAfterRemoveLiquidity = false;
    public enableHookAdjustedAmounts = false;

    onBeforeAddLiquidity() {
        return { success: false, hookAdjustedBalancesScaled18: [] };
    }
    onAfterAddLiquidity() {
        return { success: false, hookAdjustedAmountsInRaw: [] };
    }
    onBeforeRemoveLiquidity(
        kind: RemoveKind,
        maxBptAmountIn: bigint,
        minAmountsOutScaled18: bigint[],
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
        expect(kind).to.eq(removeLiquidityInput.kind);
        expect(maxBptAmountIn).to.deep.eq(
            removeLiquidityInput.maxBptAmountInRaw,
        );
        expect(minAmountsOutScaled18).to.deep.eq(
            removeLiquidityInput.minAmountsOutRaw,
        );
        expect(balancesScaled18).to.deep.eq(pool.balancesLiveScaled18);
        return {
            success: true,
            hookAdjustedBalancesScaled18: hookState.balanceChange as bigint[],
        };
    }
    onAfterRemoveLiquidity() {
        return {
            success: true,
            hookAdjustedAmountsOutRaw: [],
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

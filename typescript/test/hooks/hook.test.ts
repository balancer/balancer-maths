// pnpm test -- hook.test.ts
import { describe, expect, test } from 'vitest';
import { MaxSwapParams, Vault, type PoolBase } from '../../src';
import { HookBase } from '@/hooks/types';

describe('hook tests', () => {
    const vault = new Vault({
        customPoolClasses: {
            CustomPool: CustomPool,
        },
        customHookClasses: {
            CustomHook: CustomHook,
        },
    });

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
        balancesLiveScaled18: [64604926441576011n, 46686842105263157924n],
        tokenRates: [1000000000000000000n, 1000000000000000000n],
        totalSupply: 1736721048412749353n,
        randoms: [77n, 88n],
    };
    test('should throw when no hook state passed', () => {
        expect(() => {
            vault.swap(
                {
                    amountRaw: 1n,
                    tokenIn: '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9',
                    tokenOut: '0xb19382073c7A0aDdbb56Ac6AF1808Fa49e377B75',
                    swapKind: 0,
                },
                pool,
            );
        }).toThrowError('No state for Hook: CustomHook');
    });
    test('should throw when unsupported hookType', () => {
        expect(() => {
            vault.swap(
                {
                    amountRaw: 1n,
                    tokenIn: '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9',
                    tokenOut: '0xb19382073c7A0aDdbb56Ac6AF1808Fa49e377B75',
                    swapKind: 0,
                },
                { ...pool, hookType: 'Unsupported' },
            );
        }).toThrowError('Unsupported Hook Type: Unsupported');
    });
});

class CustomPool implements PoolBase {
    public randoms: bigint[];

    constructor(poolState: {
        randoms: bigint[];
    }) {
        this.randoms = poolState.randoms;
    }

    getMaxSwapAmount(_maxSwapParams: MaxSwapParams): bigint {
        return 1n;
    }

    onSwap(): bigint {
        return this.randoms[0];
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
    public shouldCallAfterRemoveLiquidity = false;

    onBeforeAddLiquidity() {
        return false;
    }
    onAfterAddLiquidity() {
        return { success: false, hookAdjustedAmountsInRaw: [] };
    }
    onBeforeRemoveLiquidity() {
        return false;
    }
    onAfterRemoveLiquidity() {
        return { success: false, hookAdjustedAmountsOutRaw: [] };
    }
    onBeforeSwap() {
        return false;
    }
    onAfterSwap() {
        return { success: false, hookAdjustedAmountCalculatedRaw: 0n };
    }
    onComputeDynamicSwapFee() {
        return { success: false, dynamicSwapFee: 0n };
    }
}
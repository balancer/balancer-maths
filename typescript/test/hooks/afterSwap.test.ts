// pnpm test -- afterSwap.test.ts
import { describe, expect, test } from 'vitest';
import { SwapKind, Vault, type PoolBase } from '../../src';
import { AfterSwapParams, HookBase } from '@/hooks/types';

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
    balancesLiveScaled18: [1000000000000000000n, 1000000000000000000n],
    tokenRates: [1000000000000000000n, 1000000000000000000n],
    totalSupply: 1000000000000000000n,
};

const swapInput = {
    swapKind: SwapKind.GivenIn,
    amountRaw: 1000000000000000000n,
    tokenIn: pool.tokens[0],
    tokenOut: pool.tokens[1],
};

const expectedCalculated = 100000000000n;

describe('hook - afterSwap', () => {
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
            with aggregateFee = 0, balance out is just balance - calculated 
        */
        const inputHookState = {
            expectedBalancesLiveScaled18: [
                pool.balancesLiveScaled18[0] + swapInput.amountRaw,
                pool.balancesLiveScaled18[1] - expectedCalculated,
            ],
            expectedCalculated,
        };
        const test = vault.swap(
            swapInput,
            {
                ...pool,
                aggregateSwapFee: 0n,
            },
            inputHookState,
        );
        expect(test).to.eq(1n);
    });

    test('aggregateSwapFee of 50% should take half of remaining', () => {
        /*
            hook state is used to pass expected value to tests
            Aggregate fee amount is 50% of swap fee
        */
        const expectedAggregateSwapFeeAmount = 50000000000000000n;
        const inputHookState = {
            expectedBalancesLiveScaled18: [
                pool.balancesLiveScaled18[0] +
                    swapInput.amountRaw -
                    expectedAggregateSwapFeeAmount,
                pool.balancesLiveScaled18[1] - expectedCalculated,
            ],
            expectedCalculated,
        };
        const test = vault.swap(swapInput, pool, inputHookState);
        expect(test).to.eq(1n);
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
        return expectedCalculated;
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
    public shouldCallAfterSwap = true;
    public shouldCallBeforeAddLiquidity = false;
    public shouldCallAfterAddLiquidity = false;
    public shouldCallBeforeRemoveLiquidity = false;
    public shouldCallAfterRemoveLiquidity = false;
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
    onAfterRemoveLiquidity() {
        return {
            success: false,
            hookAdjustedAmountsOutRaw: [],
        };
    }
    onBeforeSwap() {
        return { success: false, hookAdjustedBalancesScaled18: [] };
    }
    onAfterSwap(params: AfterSwapParams) {
        const {
            hookState,
            kind,
            tokenIn,
            tokenOut,
            amountInScaled18,
            amountOutScaled18,
            tokenInBalanceScaled18,
            tokenOutBalanceScaled18,
            amountCalculatedRaw,
            amountCalculatedScaled18,
        } = params;
        if (
            !(
                typeof hookState === 'object' &&
                hookState !== null &&
                'expectedBalancesLiveScaled18' in hookState
            )
        )
            throw new Error('Unexpected hookState');
        expect(kind).to.eq(swapInput.swapKind);
        expect(tokenIn).to.eq(swapInput.tokenIn);
        expect(tokenOut).to.eq(swapInput.tokenOut);
        expect(amountInScaled18).to.eq(swapInput.amountRaw);
        expect(amountCalculatedRaw).to.eq(expectedCalculated);
        expect(amountCalculatedScaled18).to.eq(expectedCalculated);
        expect(amountOutScaled18).to.eq(expectedCalculated);
        expect([tokenInBalanceScaled18, tokenOutBalanceScaled18]).to.deep.eq(
            hookState.expectedBalancesLiveScaled18,
        );

        return { success: true, hookAdjustedAmountCalculatedRaw: 1n };
    }
    onComputeDynamicSwapFee() {
        return { success: false, dynamicSwapFee: 0n };
    }
}

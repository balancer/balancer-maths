// pnpm test -- stableSurgeAddRemove.test.ts
import { describe, expect, test } from 'vitest';
import {
    AddKind,
    AddLiquidityInput,
    RemoveKind,
    RemoveLiquidityInput,
    StableState,
    Vault,
} from '../../src';
import { HookStateStableSurge } from '@/hooks/stableSurgeHook';

const poolState: StableState = {
    poolType: 'STABLE',
    hookType: 'StableSurge',
    poolAddress: '0x950682e741abd1498347a93b942463af4ec7132b',
    tokens: [
        '0x99999999999999Cc837C997B882957daFdCb1Af9',
        '0xC71Ea051a5F82c67ADcF634c36FFE6334793D24C',
    ],
    scalingFactors: [1n, 1n],
    swapFee: 400000000000000n,
    totalSupply: 2557589757607855441n,
    balancesLiveScaled18: [1315930484174775273n, 1307696122829730394n],
    tokenRates: [1101505915091109485n, 1016263325751437314n],
    amp: 1000000n,
    aggregateSwapFee: 500000000000000000n,
    supportsUnbalancedLiquidity: true,
};

const hookState: HookStateStableSurge = {
    hookType: 'StableSurge',
    surgeThresholdPercentage: 20000000000000000n,
    maxSurgeFeePercentage: 50000000000000000n,
    amp: poolState.amp,
};

describe('hook - stableSurge, add and remove tests', () => {
    const vault = new Vault();

    describe('pool is not surging', () => {
        describe('add liquidity', () => {
            test('Unbalanced should succeed', () => {
                const addLiquidityInput: AddLiquidityInput = {
                    pool: '0x950682e741abd1498347a93b942463af4ec7132b',
                    maxAmountsInRaw: [10000000000n, 10000000000n],
                    minBptAmountOutRaw: 0n,
                    kind: AddKind.UNBALANCED,
                };
                const addResult = vault.addLiquidity(
                    addLiquidityInput,
                    poolState,
                    hookState,
                );
                expect(addResult.bptAmountOutRaw).to.deep.eq(20644492894n);
                expect(addResult.amountsInRaw).to.deep.eq(
                    addLiquidityInput.maxAmountsInRaw,
                );
            });
            test('SingleTokenExactOut should succeed', () => {
                const addLiquidityInput: AddLiquidityInput = {
                    pool: '0x950682e741abd1498347a93b942463af4ec7132b',
                    maxAmountsInRaw: [10000000000n, 0n],
                    minBptAmountOutRaw: 10000000000n,
                    kind: AddKind.SINGLE_TOKEN_EXACT_OUT,
                };
                const addResult = vault.addLiquidity(
                    addLiquidityInput,
                    poolState,
                    hookState,
                );
                expect(addResult.bptAmountOutRaw).to.deep.eq(
                    addLiquidityInput.minBptAmountOutRaw,
                );
                expect(addResult.amountsInRaw).to.deep.eq([9314773071n, 0n]);
            });
        });
        describe('remove liquidity', () => {
            test('Proportional should succeed', () => {
                const removeLiquidityInput: RemoveLiquidityInput = {
                    pool: '0x950682e741abd1498347a93b942463af4ec7132b',
                    maxBptAmountInRaw: 100000000000000000n,
                    minAmountsOutRaw: [1n, 1n],
                    kind: RemoveKind.PROPORTIONAL,
                };
                const removeResult = vault.removeLiquidity(
                    removeLiquidityInput,
                    poolState,
                    hookState,
                );
                expect(removeResult.bptAmountInRaw).to.deep.eq(
                    removeLiquidityInput.maxBptAmountInRaw,
                );
                expect(removeResult.amountsOutRaw).to.deep.eq([
                    46710576781505052n,
                    50311781860935300n,
                ]);
            });
            test('SingleTokenExactIn should succeed', () => {
                const removeLiquidityInput: RemoveLiquidityInput = {
                    pool: '0x950682e741abd1498347a93b942463af4ec7132b',
                    maxBptAmountInRaw: 10000000000n,
                    minAmountsOutRaw: [1n, 0n],
                    kind: RemoveKind.SINGLE_TOKEN_EXACT_IN,
                };
                const removeResult = vault.removeLiquidity(
                    removeLiquidityInput,
                    poolState,
                    hookState,
                );
                expect(removeResult.bptAmountInRaw).to.deep.eq(
                    removeLiquidityInput.maxBptAmountInRaw,
                );
                expect(removeResult.amountsOutRaw).to.deep.eq([
                    9311058835n,
                    0n,
                ]);
            });
            test('SingleTokenExactOut should succeed', () => {
                const removeLiquidityInput: RemoveLiquidityInput = {
                    pool: '0x950682e741abd1498347a93b942463af4ec7132b',
                    maxBptAmountInRaw: 10000000000n,
                    minAmountsOutRaw: [10000000n, 0n],
                    kind: RemoveKind.SINGLE_TOKEN_EXACT_OUT,
                };
                const removeResult = vault.removeLiquidity(
                    removeLiquidityInput,
                    poolState,
                    hookState,
                );
                expect(removeResult.bptAmountInRaw).to.deep.eq(10739922n);
                expect(removeResult.amountsOutRaw).to.deep.eq(
                    removeLiquidityInput.minAmountsOutRaw,
                );
            });
        });
    });

    describe('pool is surging', () => {
        describe('add liquidity', () => {
            test('Unbalanced should throw', () => {
                const addLiquidityInput: AddLiquidityInput = {
                    pool: '0x950682e741abd1498347a93b942463af4ec7132b',
                    maxAmountsInRaw: [10000000n, 100000000000000000n],
                    minBptAmountOutRaw: 0n,
                    kind: AddKind.UNBALANCED,
                };
                expect(() =>
                    vault.addLiquidity(addLiquidityInput, poolState, hookState),
                ).to.throw(
                    'AfterAddLiquidityHookFailed',
                );
            });
            test('SingleTokenExactOut should throw', () => {
                const addLiquidityInput: AddLiquidityInput = {
                    pool: '0x950682e741abd1498347a93b942463af4ec7132b',
                    maxAmountsInRaw: [100000000000000000n, 0n],
                    minBptAmountOutRaw: 100000000000000000n,
                    kind: AddKind.SINGLE_TOKEN_EXACT_OUT,
                };
                expect(() =>
                    vault.addLiquidity(addLiquidityInput, poolState, hookState),
                ).to.throw(
                    'AfterAddLiquidityHookFailed',
                );
            });
        });
        describe('remove liquidity', () => {
            test('SingleTokenExactIn should throw', () => {
                const removeLiquidityInput: RemoveLiquidityInput = {
                    pool: '0x950682e741abd1498347a93b942463af4ec7132b',
                    maxBptAmountInRaw: 100000000000000000n,
                    minAmountsOutRaw: [1n, 0n],
                    kind: RemoveKind.SINGLE_TOKEN_EXACT_IN,
                };
                expect(() =>
                    vault.removeLiquidity(removeLiquidityInput, poolState, hookState),
                ).to.throw(
                    'AfterRemoveLiquidityHookFailed',
                );
            });
            test('SingleTokenExactOut should throw', () => {
                const removeLiquidityInput: RemoveLiquidityInput = {
                    pool: '0x950682e741abd1498347a93b942463af4ec7132b',
                    maxBptAmountInRaw: 100000000000000000n,
                    minAmountsOutRaw: [100000000000000000n, 0n],
                    kind: RemoveKind.SINGLE_TOKEN_EXACT_OUT,
                };
                expect(() =>
                    vault.removeLiquidity(removeLiquidityInput, poolState, hookState),
                ).to.throw(
                    'AfterRemoveLiquidityHookFailed',
                );
            });
        });
    });
});

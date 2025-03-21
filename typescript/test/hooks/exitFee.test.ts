// pnpm test -- exitFee.test.ts
import { describe, expect, test } from 'vitest';
import { RemoveKind, Vault } from '../../src';

const poolState = {
    poolType: 'WEIGHTED',
    hookType: 'ExitFee',
    chainId: '11155111',
    blockNumber: '5955145',
    poolAddress: '0x03722034317d8fb16845213bd3ce15439f9ce136',
    tokens: [
        '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9',
        '0xb19382073c7A0aDdbb56Ac6AF1808Fa49e377B75',
    ],
    scalingFactors: [1n, 1n],
    weights: [500000000000000000n, 500000000000000000n],
    swapFee: 100000000000000000n,
    aggregateSwapFee: 0n,
    balancesLiveScaled18: [5000000000000000n, 5000000000000000000n],
    tokenRates: [1000000000000000000n, 1000000000000000000n],
    totalSupply: 158113883008415798n,
    supportsUnbalancedLiquidity: true,
};

const removeLiquidityInput = {
    pool: '0x03722034317d8fb16845213bd3ce15439f9ce136',
    minAmountsOutRaw: [1n, 1n],
    maxBptAmountInRaw: 10000000000000n,
    kind: RemoveKind.PROPORTIONAL,
};

describe('hook - exitFee', () => {
    const vault = new Vault();

    test('exitFee of 0', () => {
        const inputHookState = {
            removeLiquidityHookFeePercentage: 0n,
            tokens: poolState.tokens,
        };
        const outPutAmount = vault.removeLiquidity(
            removeLiquidityInput,
            poolState,
            inputHookState,
        );
        expect(outPutAmount.amountsOutRaw).to.deep.eq([
            316227766016n,
            316227766016844n,
        ]);
    });

    test('exitFee of 5%', () => {
        const inputHookState = {
            removeLiquidityHookFeePercentage: 50000000000000000n,
            tokens: poolState.tokens,
        };
        const outPutAmount = vault.removeLiquidity(
            removeLiquidityInput,
            poolState,
            inputHookState,
        );
        expect(outPutAmount.amountsOutRaw).to.deep.eq([
            300416377716n,
            300416377716002n,
        ]);
    });
});

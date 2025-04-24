// pnpm test -- liquidityBootstrapping.test.ts
import { describe, expect, test } from 'vitest';
import { RemoveKind, Vault } from '../../src';
import { AddLiquidityInput, RemoveLiquidityInput } from '../../src/vault/types';
import { HookStateLiquidityBootstrapping } from '@/hooks/liquidityBootstrappingHook';

const poolState = {
    poolType: 'LIQUIDITY_BOOTSTRAPPING',
    hookType: 'LiquidityBootstrapping',
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

const removeLiquidityInput: RemoveLiquidityInput = {
    pool: '0x03722034317d8fb16845213bd3ce15439f9ce136',
    minAmountsOutRaw: [1n, 1n],
    maxBptAmountInRaw: 10000000000000n,
    kind: RemoveKind.PROPORTIONAL,
};

const addLiquidityInput: AddLiquidityInput = {
    pool: '0x03722034317d8fb16845213bd3ce15439f9ce136',
    maxAmountsInRaw: [2000000000000000n, 1000000000000000n],
    minBptAmountOutRaw: 0n,
    kind: 0,
};

const owner: string = '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9';
const lp: string = '0x8D96DAeBFDdBdE719d85E6bC1F5ED1175a624633';

const hookState: HookStateLiquidityBootstrapping = {
    hookType: 'LiquidityBootstrapping',
    lbpOwner: owner,
    endTime: BigInt(Date.now() + 3600),
    sender: lp,
    currentTimestamp: BigInt(Date.now()),
};

describe('hook - liquidityBootstrapping', () => {
    const vault = new Vault();

    test('addLiquidity - throws as adder is not owner', () => {
        expect(() =>
            vault.addLiquidity(addLiquidityInput, poolState, hookState),
        ).toThrowError('Liquidity adder is not the lbp owner');
    });
    test('addLiquidity - success', () => {
        const hookStateWithOwner = {
            ...hookState,
            sender: owner,
        };
        const result = vault.addLiquidity(
            addLiquidityInput,
            poolState,
            hookStateWithOwner,
        );

        // proper values are tested in the weighted pool tests for addLiquidity
        expect(result).toBeDefined();
    });
    test('removeLiquidity - throws as LBP has not ended', () => {
        expect(() =>
            vault.removeLiquidity(removeLiquidityInput, poolState, hookState),
        ).toThrowError('LBP has not ended yet');
    });
    test('removeLiquidity - success', () => {
        const hookStateWithEndTime = {
            ...hookState,
            currentTimestamp: BigInt(Date.now() + 3700),
        };
        const result = vault.removeLiquidity(
            removeLiquidityInput,
            poolState,
            hookStateWithEndTime,
        );
        // proper values are tested in the weighted pool tests for removeLiquidity
        expect(result).toBeDefined();
    });
});

// pnpm test -- customPool.test.ts
import { describe, expect, test } from 'vitest';
import { Vault, type PoolBase } from '../src';

describe('custom pool tests', () => {
    test('should pick up new pool', () => {
        const vault = new Vault({
            customPoolClasses: {
                CustomPool: CustomPool,
            },
        });

        const pool = {
            poolType: 'CustomPool',
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
            aggregateSwapFee: 0n,
        };

        const calculatedAmount = vault.swap(
            {
                amountRaw: 1n,
                tokenIn: '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9',
                tokenOut: '0xb19382073c7A0aDdbb56Ac6AF1808Fa49e377B75',
                swapKind: 0,
            },
            pool,
        );
        expect(calculatedAmount).toEqual(pool.randoms[0]);
    });
});

class CustomPool implements PoolBase {
    public randoms: bigint[];

    constructor(poolState: { randoms: bigint[] }) {
        this.randoms = poolState.randoms;
    }

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
        return this.randoms[0];
    }
    computeInvariant(): bigint {
        return 1n;
    }
    computeBalance(): bigint {
        return 1n;
    }
}

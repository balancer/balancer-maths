# Balancer Maths TS

Typescript implementation of maths for Balancer pools.

## Swap

```typescript
const vault = new Vault();

const pool = {
  chainId: '11155111',
  blockNumber: '5955146',
  poolType: 'Weighted',
  poolAddress: '0x204d4194e4e42364e3d1841d0a9b1ef857879c31',
  tokens: [
    '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9',
    '0xb19382073c7A0aDdbb56Ac6AF1808Fa49e377B75'
  ],
  scalingFactors: [ 1000000000000000000n, 1000000000000000000n ],
  weights: [ 500000000000000000n, 500000000000000000n ],
  swapFee: 1000000000000000n,
  balances: [ 64604926441576011n, 46686842105263157924n ],
  tokenRates: [ 1000000000000000000n, 1000000000000000000n ],
  totalSupply: 1736721048412749353n
};

const calculatedAmount = vault.swap(
    {
        amountRaw,
        tokenIn,
        tokenOut,
        swapKind,
    },
    pool,
);
```

## AddLiquidity

```typescript
const vault = new Vault();

const pool = {
  chainId: '11155111',
  blockNumber: '5955145',
  poolType: 'Weighted',
  poolAddress: '0x204d4194e4e42364e3d1841d0a9b1ef857879c31',
  tokens: [
    '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9',
    '0xb19382073c7A0aDdbb56Ac6AF1808Fa49e377B75'
  ],
  scalingFactors: [ 1000000000000000000n, 1000000000000000000n ],
  weights: [ 500000000000000000n, 500000000000000000n ],
  swapFee: 0n,
  balances: [ 64604926441576011n, 46686842105263157924n ],
  tokenRates: [ 1000000000000000000n, 1000000000000000000n ],
  totalSupply: 1736721048412749353n
}

const calculatedAmounts = vault.addLiquidity(
    {
        pool: pool.poolAddress,
        maxAmountsIn: inputAmountsRaw,
        minBptAmountOut: bptOutRaw,
        kind,
    },
    pool,
);
```


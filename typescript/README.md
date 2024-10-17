# Balancer Maths TS

Typescript implementation of maths for Balancer pools. Also published as a [package on NPM](https://www.npmjs.com/package/@balancer-labs/balancer-maths).

## Hooks Support

Hooks are supported on a case by case basis.

When a pool has a hook type included in the `PoolState` a `HookState` must also be passed as an input to any Vault operation. See [Remove Liquidity example](#remove-liquidity) below.

Currently supported hooks:

* ExitFeeHook
  * This hook implements the ExitFeeHookExample found in [mono-repo](https://github.com/balancer/balancer-v3-monorepo/blob/c848c849cb44dc35f05d15858e4fba9f17e92d5e/pkg/pool-hooks/contracts/ExitFeeHookExample.sol)

## Examples

### Swap

```typescript
const vault = new Vault();

const pool = {
  chainId: '11155111',
  blockNumber: '5955146',
  poolType: 'WEIGHTED',
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

### Add Liquidity

```typescript
const vault = new Vault();

const pool = {
  chainId: '11155111',
  blockNumber: '5955145',
  poolType: 'WEIGHTED',
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

### Remove Liquidity

This example shows how to calculate the result of a remove liqudity operation when the pool is registered with the ExitFee hook.

```typescript
const vault = new Vault();

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
    scalingFactors: [1000000000000000000n, 1000000000000000000n],
    weights: [500000000000000000n, 500000000000000000n],
    swapFee: 100000000000000000n,
    aggregateSwapFee: 0n,
    balancesLiveScaled18: [5000000000000000n, 5000000000000000000n],
    tokenRates: [1000000000000000000n, 1000000000000000000n],
    totalSupply: 158113883008415798n,
};

const inputHookState = {
    removeLiquidityHookFeePercentage: 0n,
    tokens: poolState.tokens,
};

const removeLiquidityInput = {
    pool: '0xb2456a6f51530053bc41b0ee700fe6a2c37282e8',
    minAmountsOutRaw: [1n, 1n],
    maxBptAmountInRaw: 10000000000000n,
    kind: RemoveKind.PROPORTIONAL,
};

const outPutAmount = vault.removeLiquidity(
    {
        pool: pool.poolAddress,
        minAmountsOutRaw: amountsOutRaw,
        maxBptAmountInRaw: bptInRaw,
        kind,
    },
    pool,
    inputHookState
);
```


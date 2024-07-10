type PoolType = "Weighted";

export type WeightedMutable = {
  swapFee: bigint;
  balances: bigint[];
  tokenRates: bigint[];
  totalSupply: bigint;
};

export type WeightedImmutable = {
  weights: bigint[];
  tokens: string[];
  scalingFactors: bigint[];
};

export type WeightedState = { poolType: PoolType } & WeightedImmutable &
  WeightedMutable;

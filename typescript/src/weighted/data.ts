export type WeightedMutable = {
	swapFee: bigint;
	balances: bigint[];
	tokenRates: bigint[];
};

export type WeightedImmutable = {
	weights: bigint[];
	tokens: string[];
	scalingFactors: bigint[];
};

export type WeightedState = WeightedImmutable & WeightedMutable;

export type StableMutable = {
	swapFee: bigint;
	balances: bigint[];
	tokenRates: bigint[];
	totalSupply: bigint;
	amp: bigint;
};

export type StableImmutable = {
	tokens: string[];
	scalingFactors: bigint[];
};

export type StableState = { poolType: string } & StableImmutable & StableMutable;

export type PoolState = {
    poolType: string;
    tokens: string[];
    scalingFactors: bigint[];
    tokenRates: bigint[];
    balancesLiveScaled18: bigint[];
    swapFee: bigint;
    aggregateSwapFee: bigint;
    totalSupply: bigint;
    hookType?: string;
};

export enum SwapKind {
    GivenIn = 0,
    GivenOut = 1,
}

export interface PoolBase {
    getMaxSwapAmount(maxSwapParams: MaxSwapParams): bigint;
    getMaxSingleTokenRemoveAmount(
        isExactIn: boolean,
        totalSupply: bigint,
        tokenOutBalance: bigint,
        tokenOutScalingFactor: bigint,
        tokenOutRate: bigint,
    ): bigint;
    getMaxSingleTokenAddAmount(): bigint;
    onSwap(swapParams: SwapParams): bigint;
    computeInvariant(balancesLiveScaled18: bigint[]): bigint;
    computeBalance(
        balancesLiveScaled18: bigint[],
        tokenInIndex: number,
        invariantRatio: bigint,
    ): bigint;
}

export type MaxSwapParams = {
    swapKind: SwapKind;
    balancesLiveScaled18: bigint[];
    tokenRates: bigint[];
    scalingFactors: bigint[];
    indexIn: number;
    indexOut: number;
};

export type SwapParams = {
    swapKind: SwapKind;
    amountGivenScaled18: bigint;
    balancesLiveScaled18: bigint[];
    indexIn: number;
    indexOut: number;
};

export type SwapInput = {
    amountRaw: bigint;
    tokenIn: string;
    tokenOut: string;
    swapKind: SwapKind;
};

export enum AddKind {
    UNBALANCED = 0,
    SINGLE_TOKEN_EXACT_OUT = 1,
}

export type AddLiquidityInput = {
    pool: string;
    maxAmountsIn: bigint[];
    minBptAmountOut: bigint;
    kind: AddKind;
};

export enum RemoveKind {
    PROPORTIONAL = 0,
    SINGLE_TOKEN_EXACT_IN = 1,
    SINGLE_TOKEN_EXACT_OUT = 2,
}

export type RemoveLiquidityInput = {
    pool: string;
    minAmountsOut: bigint[];
    maxBptAmountIn: bigint;
    kind: RemoveKind;
};

/**
 * State of a pool. Note - rates, fees, totalSupply use scaled 18.
 */
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

export enum Rounding {
    ROUND_UP = 0,
    ROUND_DOWN = 1,
}

export interface PoolBase {
    getMaxSwapAmount(maxSwapParams: MaxSwapParams): bigint;
    getMaxSingleTokenRemoveAmount(
        maxRemoveParams: MaxSingleTokenRemoveParams,
    ): bigint;
    getMaxSingleTokenAddAmount(): bigint;
    onSwap(swapParams: SwapParams): bigint;
    computeInvariant(
        balancesLiveScaled18: bigint[],
        rounding: Rounding,
    ): bigint;
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

export type MaxSingleTokenRemoveParams = {
    isExactIn: boolean;
    totalSupply: bigint;
    tokenOutBalance: bigint;
    tokenOutScalingFactor: bigint;
    tokenOutRate: bigint;
};

export type SwapParams = {
    swapKind: SwapKind;
    amountGivenScaled18: bigint;
    balancesLiveScaled18: bigint[];
    indexIn: number;
    indexOut: number;
};

/**
 * User defined input for a swap operation.
 *
 * @property {bigint} amountRaw - Raw amount for swap (e.g. 1USDC=1000000).
 * @property {string} tokenIn - Address of token in.
 * @property {string} tokenOut - Address of token out.
 * @property {SwapKind} swapKind - GivenIn or GivenOut.
 */
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
    maxAmountsInRaw: bigint[];
    minBptAmountOutRaw: bigint;
    kind: AddKind;
};

export enum RemoveKind {
    PROPORTIONAL = 0,
    SINGLE_TOKEN_EXACT_IN = 1,
    SINGLE_TOKEN_EXACT_OUT = 2,
}

export type RemoveLiquidityInput = {
    pool: string;
    minAmountsOutRaw: bigint[];
    maxBptAmountInRaw: bigint;
    kind: RemoveKind;
};

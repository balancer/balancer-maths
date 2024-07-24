import { AddKind, RemoveKind, SwapInput, SwapKind } from '@/vault/types';
import { HookStateExitFee } from './exitFeeHook';

export type HookState = HookStateExitFee;

export type AfterSwapParams = {
    kind: SwapKind;
    tokenIn: string;
    tokenOut: string;
    amountInScaled18: bigint;
    amountOutScaled18: bigint;
    tokenInBalanceScaled18: bigint;
    tokenOutBalanceScaled18: bigint;
    amountCalculatedScaled18: bigint;
    amountCalculatedRaw: bigint;
    router: string;
    pool: string;
    userData: string;
};

export interface HookBase {
    shouldCallComputeDynamicSwapFee: boolean;
    shouldCallBeforeSwap: boolean;
    shouldCallAfterSwap: boolean;
    shouldCallBeforeAddLiquidity: boolean;
    shouldCallAfterAddLiquidity: boolean;
    shouldCallBeforeRemoveLiquidity: boolean;
    shouldCallAfterRemoveLiquidity: boolean;

    onBeforeAddLiquidity(
        router: string,
        pool: string,
        kind: AddKind,
        maxAmountsInScaled18: bigint[],
        minBptAmountOut: bigint,
        balancesScaled18: bigint[],
        userData: string,
    ): boolean;
    onAfterAddLiquidity(
        router: string,
        pool: string,
        kind: AddKind,
        amountsInScaled18: bigint[],
        amountsInRaw: bigint[],
        bptAmountOut: bigint,
        balancesScaled18: bigint[],
        userData: string,
    ): { success: boolean; hookAdjustedAmountsInRaw: bigint[] };
    onBeforeRemoveLiquidity(
        router: string,
        pool: string,
        kind: RemoveKind,
        maxBptAmountIn: bigint,
        minAmountsOutScaled18: bigint[],
        balancesScaled18: bigint[],
        userData: string,
    ): boolean;
    onAfterRemoveLiquidity(
        router: string,
        pool: string,
        kind: RemoveKind,
        bptAmountIn: bigint,
        amountsOutScaled18: bigint[],
        amountsOutRaw: bigint[],
        balancesScaled18: bigint[],
        userData: string,
    ): { success: boolean; hookAdjustedAmountsOutRaw: bigint[] };
    onBeforeSwap(params: SwapInput, poolAddress: string): boolean;
    onAfterSwap(params: AfterSwapParams): {
        success: boolean;
        hookAdjustedAmountCalculatedRaw: bigint;
    };
    onComputeDynamicSwapFee(
        params: SwapInput,
        poolAddress: string,
        staticSwapFeePercentage: bigint,
    ): { success: boolean; dynamicSwapFee: bigint };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type HookClassConstructor = new (..._args: any[]) => HookBase;

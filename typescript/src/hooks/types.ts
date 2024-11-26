import {
    AddKind,
    RemoveKind,
    SwapInput,
    SwapKind,
    SwapParams,
} from '@/vault/types';
import { HookStateExitFee } from './exitFeeHook';
import { HookStateStableSurge } from './stableSurgeHook';

export type HookState = HookStateExitFee | HookStateStableSurge;

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
    hookState: HookState | unknown;
};

export interface HookBase {
    shouldCallComputeDynamicSwapFee: boolean;
    shouldCallBeforeSwap: boolean;
    shouldCallAfterSwap: boolean;
    shouldCallBeforeAddLiquidity: boolean;
    shouldCallAfterAddLiquidity: boolean;
    shouldCallBeforeRemoveLiquidity: boolean;
    shouldCallAfterRemoveLiquidity: boolean;
    enableHookAdjustedAmounts: boolean;

    onBeforeAddLiquidity(
        kind: AddKind,
        maxAmountsInScaled18: bigint[],
        minBptAmountOut: bigint,
        balancesScaled18: bigint[],
        hookState: HookState | unknown,
    ): { success: boolean; hookAdjustedBalancesScaled18: bigint[] };
    onAfterAddLiquidity(
        kind: AddKind,
        amountsInScaled18: bigint[],
        amountsInRaw: bigint[],
        bptAmountOut: bigint,
        balancesScaled18: bigint[],
        hookState: HookState | unknown,
    ): { success: boolean; hookAdjustedAmountsInRaw: bigint[] };
    onBeforeRemoveLiquidity(
        kind: RemoveKind,
        maxBptAmountIn: bigint,
        minAmountsOutScaled18: bigint[],
        balancesScaled18: bigint[],
        hookState: HookState | unknown,
    ): { success: boolean; hookAdjustedBalancesScaled18: bigint[] };
    onAfterRemoveLiquidity(
        kind: RemoveKind,
        bptAmountIn: bigint,
        amountsOutScaled18: bigint[],
        amountsOutRaw: bigint[],
        balancesScaled18: bigint[],
        hookState: HookState | unknown,
    ): { success: boolean; hookAdjustedAmountsOutRaw: bigint[] };
    onBeforeSwap(params: SwapInput & { hookState: HookState | unknown }): {
        success: boolean;
        hookAdjustedBalancesScaled18: bigint[];
    };
    onAfterSwap(params: AfterSwapParams): {
        success: boolean;
        hookAdjustedAmountCalculatedRaw: bigint;
    };
    onComputeDynamicSwapFee(
        params: SwapParams,
        pool: string,
        staticSwapFeePercentage: bigint,
        hookState: HookState | unknown,
    ): { success: boolean; dynamicSwapFee: bigint };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type HookClassConstructor = new (..._args: any[]) => HookBase;

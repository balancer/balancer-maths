import { HookBase } from './types';

export const defaultHook: HookBase = {
    shouldCallComputeDynamicSwapFee: false,
    shouldCallBeforeSwap: false,
    shouldCallAfterSwap: false,
    shouldCallBeforeAddLiquidity: false,
    shouldCallAfterAddLiquidity: false,
    shouldCallBeforeRemoveLiquidity: false,
    shouldCallAfterRemoveLiquidity: false,
    enableHookAdjustedAmounts: false,
    onBeforeAddLiquidity: () => {
        return { success: false, hookAdjustedBalancesScaled18: [] };
    },
    onAfterAddLiquidity: () => {
        return { success: false, hookAdjustedAmountsInRaw: [] };
    },
    onBeforeRemoveLiquidity: () => {
        return { success: false, hookAdjustedBalancesScaled18: [] };
    },
    onAfterRemoveLiquidity: () => {
        return { success: false, hookAdjustedAmountsOutRaw: [] };
    },
    onBeforeSwap: () => {
        return { success: false, hookAdjustedBalancesScaled18: [] };
    },
    onAfterSwap: () => {
        return { success: false, hookAdjustedAmountCalculatedRaw: 0n };
    },
    onComputeDynamicSwapFee: () => {
        return { success: false, dynamicSwapFee: 0n };
    },
};

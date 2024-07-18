import { HookBase } from './types';

export const defaultHook: HookBase = {
    shouldCallComputeDynamicSwapFee: false,
    shouldCallBeforeSwap: false,
    shouldCallAfterSwap: false,
    shouldCallBeforeAddLiquidity: false,
    shouldCallAfterAddLiquidity: false,
    shouldCallBeforeRemoveLiquidity: false,
    shouldCallAfterRemoveLiquidity: false,
    onBeforeAddLiquidity: () => {
        return false;
    },
    onAfterAddLiquidity: () => {
        return { success: false, hookAdjustedAmountsInRaw: [] };
    },
    onBeforeRemoveLiquidity: () => {
        return false;
    },
    onAfterRemoveLiquidity: () => {
        return { success: false, hookAdjustedAmountsOutRaw: [] };
    },
    onBeforeSwap: () => {
        return false;
    },
    onAfterSwap: () => {
        return { success: false, hookAdjustedAmountCalculatedRaw: 0n };
    },
    onComputeDynamicSwapFee: () => {
        return { success: false, dynamicSwapFee: 0n };
    },
};

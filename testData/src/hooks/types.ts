import type { Address } from 'viem';

export type HookType = 'FEE_TAKING' | 'EXIT_FEE' | 'STABLE_SURGE' | 'MEV_TAX' | 'UNKNOWN';

export type HookData = {
    address: Address;
    type: HookType;
    enableHookAdjustedAmounts: boolean;
    shouldCallAfterSwap: boolean;
    shouldCallBeforeSwap: boolean;
    shouldCallAfterInitialize: boolean;
    shouldCallBeforeInitialize: boolean;
    shouldCallAfterAddLiquidity: boolean;
    shouldCallBeforeAddLiquidity: boolean;
    shouldCallAfterRemoveLiquidity: boolean;
    shouldCallBeforeRemoveLiquidity: boolean;
    shouldCallComputeDynamicSwapFee: boolean;
    dynamicData?: Record<string, string>;
};

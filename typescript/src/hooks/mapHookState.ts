import { HookState } from './types';
import { HookStateExitFee } from './exitFeeHook';
import { HookStateStableSurge } from './stableSurgeHook';

type HookData = {
    address: string;
    type: string;
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

/**
 * Maps hook data from JSON test files into typed HookState objects
 * that can be used with hook implementations
 */
export function mapHookState(
    hookData: HookData,
    poolData: { tokens: string[]; amp?: bigint },
): HookState {
    switch (hookData.type) {
        case 'EXIT_FEE':
            return mapExitFeeHookState(hookData, poolData.tokens);
        case 'STABLE_SURGE':
            return mapStableSurgeHookState(hookData, poolData);
        default:
            throw new Error(`Unsupported hook type: ${hookData.type}`);
    }
}

function mapExitFeeHookState(
    hookData: HookData,
    tokens: string[],
): HookStateExitFee {
    if (!hookData.dynamicData?.removeLiquidityHookFeePercentage) {
        throw new Error(
            'EXIT_FEE hook requires removeLiquidityHookFeePercentage in dynamicData',
        );
    }

    const {
        shouldCallComputeDynamicSwapFee,
        shouldCallBeforeSwap,
        shouldCallAfterSwap,
        shouldCallBeforeAddLiquidity,
        shouldCallAfterAddLiquidity,
        shouldCallBeforeRemoveLiquidity,
        shouldCallAfterRemoveLiquidity,
        enableHookAdjustedAmounts,
    } = hookData;

    return {
        hookType: 'ExitFee',
        // Configuration flags
        shouldCallComputeDynamicSwapFee,
        shouldCallBeforeSwap,
        shouldCallAfterSwap,
        shouldCallBeforeAddLiquidity,
        shouldCallAfterAddLiquidity,
        shouldCallBeforeRemoveLiquidity,
        shouldCallAfterRemoveLiquidity,
        enableHookAdjustedAmounts,
        // Hook-specific data
        tokens,
        removeLiquidityHookFeePercentage: BigInt(
            hookData.dynamicData.removeLiquidityHookFeePercentage,
        ),
    };
}

function mapStableSurgeHookState(
    hookData: HookData,
    poolData: { tokens: string[]; amp?: bigint },
): HookStateStableSurge {
    if (!hookData.dynamicData?.surgeThresholdPercentage) {
        throw new Error(
            'STABLE_SURGE hook requires surgeThresholdPercentage in dynamicData',
        );
    }
    if (!hookData.dynamicData?.maxSurgeFeePercentage) {
        throw new Error(
            'STABLE_SURGE hook requires maxSurgeFeePercentage in dynamicData',
        );
    }
    if (!poolData.amp) {
        throw new Error('STABLE_SURGE hook requires amp from pool data');
    }

    const {
        shouldCallComputeDynamicSwapFee,
        shouldCallBeforeSwap,
        shouldCallAfterSwap,
        shouldCallBeforeAddLiquidity,
        shouldCallAfterAddLiquidity,
        shouldCallBeforeRemoveLiquidity,
        shouldCallAfterRemoveLiquidity,
        enableHookAdjustedAmounts,
    } = hookData;

    return {
        hookType: 'StableSurge',
        // Configuration flags
        shouldCallComputeDynamicSwapFee,
        shouldCallBeforeSwap,
        shouldCallAfterSwap,
        shouldCallBeforeAddLiquidity,
        shouldCallAfterAddLiquidity,
        shouldCallBeforeRemoveLiquidity,
        shouldCallAfterRemoveLiquidity,
        enableHookAdjustedAmounts,
        // Hook-specific data
        amp: poolData.amp,
        surgeThresholdPercentage: BigInt(
            hookData.dynamicData.surgeThresholdPercentage,
        ),
        maxSurgeFeePercentage: BigInt(
            hookData.dynamicData.maxSurgeFeePercentage,
        ),
    };
}

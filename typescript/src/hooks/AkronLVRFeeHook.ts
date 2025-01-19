import { HookBase } from './types';
import { MathSol } from '../utils/math';
import { 
    SwapParams, 
    PoolBase, 
    PoolState,
    SwapKind
} from '@/vault/types';
import { 
    _computeSwapFeePercentageGivenExactIn,
    _computeSwapFeePercentageGivenExactOut 
} from '@/weighted/AkronWeightedMath';

export type HookStateAkronLVRFee = {
    lastBalances: bigint[];
    normalizedWeights: bigint[];
    minimumSwapFeePercentage: bigint;
};

export class AkronLVRFeeHook implements HookBase {
    public shouldCallComputeDynamicSwapFee = true;
    public shouldCallBeforeSwap = false;
    public shouldCallAfterSwap = false;
    public shouldCallBeforeAddLiquidity = false;
    public shouldCallAfterAddLiquidity = false;
    public shouldCallBeforeRemoveLiquidity = false;
    public shouldCallAfterRemoveLiquidity = false;
    public enableHookAdjustedAmounts = false;

    onComputeDynamicSwapFee(
        params: SwapParams,
        pool: string,
        staticSwapFeePercentage: bigint,
        hookState: HookStateAkronLVRFee,
    ): { success: boolean; dynamicSwapFee: bigint } {

        const calculatedSwapFeePercentage =
            params.swapKind === SwapKind.GivenIn
                ? _computeSwapFeePercentageGivenExactIn(
                    params.balancesLiveScaled18[params.indexIn],
                    hookState.lastBalances[params.indexIn],
                    hookState.normalizedWeights[params.indexIn],
                    params.balancesLiveScaled18[params.indexOut],
                    hookState.lastBalances[params.indexOut],
                    hookState.normalizedWeights[params.indexOut],
                    params.amountGivenScaled18,
                )
                : _computeSwapFeePercentageGivenExactOut(
                    params.balancesLiveScaled18[params.indexIn],
                    hookState.lastBalances[params.indexIn],
                    hookState.normalizedWeights[params.indexIn],
                    params.balancesLiveScaled18[params.indexOut],
                    hookState.lastBalances[params.indexOut],
                    hookState.normalizedWeights[params.indexOut],
                    params.amountGivenScaled18,
                );

        // Charge the static or calculated fee, whichever is greater.
        const dynamicSwapFee =
            hookState.minimumSwapFeePercentage > calculatedSwapFeePercentage 
                ? hookState.minimumSwapFeePercentage
                : calculatedSwapFeePercentage;

        return {
            success: true,
            dynamicSwapFee: dynamicSwapFee,
        };
    }

    onBeforeAddLiquidity() {
        return { success: false, hookAdjustedBalancesScaled18: [] };
    }

    onAfterAddLiquidity() {
        return { success: false, hookAdjustedAmountsInRaw: [] };
    }

    onBeforeRemoveLiquidity() {
        return { success: false, hookAdjustedBalancesScaled18: [] };
    }

    onAfterRemoveLiquidity() {
        return { success: false, hookAdjustedAmountsOutRaw: [] };
    }

    onBeforeSwap() {
        return { success: false, hookAdjustedBalancesScaled18: [] };
    }

    onAfterSwap() {
        return { success: false, hookAdjustedAmountCalculatedRaw: 0n };
    } 
}

export default AkronLVRFeeHook;

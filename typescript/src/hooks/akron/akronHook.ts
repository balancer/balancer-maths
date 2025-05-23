import { MathSol } from '../../utils/math';
import { HookBase, HookStateBase } from '../types';
import { SwapParams, SwapKind } from '../../vault/types';
import {
    _computeSwapFeePercentageGivenExactIn,
    _computeSwapFeePercentageGivenExactOut,
} from './akronWeightedMath';

export type HookStateAkron = HookStateBase & {
    hookType: 'Akron';
    weights: bigint[];
    minimumSwapFeePercentage: bigint;
};

export class AkronHook implements HookBase {
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
        hookState: HookStateAkron,
    ): { success: boolean; dynamicSwapFee: bigint } {
        const calculatedSwapFeePercentage =
            params.swapKind === SwapKind.GivenIn
                ? _computeSwapFeePercentageGivenExactIn(
                      params.balancesLiveScaled18[params.indexIn],
                      MathSol.divDownFixed(
                          hookState.weights[params.indexIn],
                          hookState.weights[params.indexOut],
                      ),
                      params.amountGivenScaled18,
                  )
                : _computeSwapFeePercentageGivenExactOut(
                      params.balancesLiveScaled18[params.indexOut],
                      MathSol.divUpFixed(
                          hookState.weights[params.indexOut],
                          hookState.weights[params.indexIn],
                      ),
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

export default AkronHook;

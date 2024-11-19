import { HookBase } from './types';
import { MathSol } from '../utils/math';
import { SwapInput } from '@/vault/types';


export type HookStateDirectionalFee = {
    tokens: string[];
    balancesLiveScaled18: bigint[];
}

export class DirectionalFeeHook implements HookBase {
    public shouldCallComputeDynamicSwapFee = true;
    public shouldCallBeforeSwap = false;
    public shouldCallAfterSwap = false;
    public shouldCallBeforeAddLiquidity = false;
    public shouldCallAfterAddLiquidity = false;
    public shouldCallBeforeRemoveLiquidity = false;
    public shouldCallAfterRemoveLiquidity = false;
    public enableHookAdjustedAmounts = false;


    onComputeDynamicSwapFee(
        params: SwapInput,
        staticSwapFeePercentage: bigint,
        hookState: HookStateDirectionalFee
    ): { success: boolean; dynamicSwapFee: bigint } {

        const lastBalancesLiveScaled18 = hookState.balancesLiveScaled18;

        const tokenInIndex = hookState.tokens.indexOf(params.tokenIn);
        const tokenOutIndex = hookState.tokens.indexOf(params.tokenOut);

        const calculatedSwapFeePercentage = this.calculateExpectedSwapFeePercentage(
            lastBalancesLiveScaled18,
            params.amountRaw, // does this need to be scaled? 
            tokenInIndex,
            tokenOutIndex
        );

        // Charge the static or calculated fee, whichever is greater.
        const dynamicSwapFee = calculatedSwapFeePercentage > staticSwapFeePercentage ? calculatedSwapFeePercentage : staticSwapFeePercentage;

        return {
            success: true,
            dynamicSwapFee: dynamicSwapFee
        };
    }

    // the bigger the swap ( relative to pool size ) the bigger the fee
    private calculateExpectedSwapFeePercentage(
        poolBalances: bigint[],
        swapAmount: bigint,
        indexIn: number,
        indexOut: number
    ): bigint {
        const finalBalanceTokenIn = poolBalances[indexIn] + swapAmount;
        const finalBalanceTokenOut = poolBalances[indexOut] - swapAmount;

        if (finalBalanceTokenIn > finalBalanceTokenOut) {
            const diff = finalBalanceTokenIn - finalBalanceTokenOut;
            const totalLiquidity = finalBalanceTokenIn + finalBalanceTokenOut;

            return MathSol.divDownFixed(diff, totalLiquidity);
        }

        return 0n;
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

export default DirectionalFeeHook;
import { HookBase, HookStateBase } from './types';
import { MathSol } from '../utils/math';
import { SwapKind, SwapParams } from '../vault/types';
import { Stable } from '../stable';

export type HookStateStableSurge = HookStateBase & {
    hookType: 'StableSurge';
    amp: bigint;
    surgeThresholdPercentage: bigint;
    maxSurgeFeePercentage: bigint;
};

// Implementation from mono-repo commit: 1c9d6a2913eb2d1210019455b44192760d9beb03
export class StableSurgeHook implements HookBase {
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
        hookState: HookStateStableSurge,
    ): { success: boolean; dynamicSwapFee: bigint } {
        const stablePool = new Stable(hookState);

        return {
            success: true,
            dynamicSwapFee: this.getSurgeFeePercentage(
                params,
                stablePool,
                hookState.surgeThresholdPercentage,
                hookState.maxSurgeFeePercentage,
                staticSwapFeePercentage,
            ),
        };
    }

    private getSurgeFeePercentage(
        params: SwapParams,
        pool: Stable,
        surgeThresholdPercentage: bigint,
        maxSurgeFeePercentage: bigint,
        staticFeePercentage: bigint,
    ): bigint {
        const amountCalculatedScaled18 = pool.onSwap(params);
        const newBalances = [...params.balancesLiveScaled18];

        if (params.swapKind === SwapKind.GivenIn) {
            newBalances[params.indexIn] += params.amountGivenScaled18;
            newBalances[params.indexOut] -= amountCalculatedScaled18;
        } else {
            newBalances[params.indexIn] += amountCalculatedScaled18;
            newBalances[params.indexOut] -= params.amountGivenScaled18;
        }

        const newTotalImbalance = this.calculateImbalance([...newBalances]);

        // If we are balanced, or the balance has improved, do not surge: simply return the regular fee percentage.
        if (newTotalImbalance === 0n) {
            return staticFeePercentage;
        }

        const oldTotalImbalance = this.calculateImbalance([
            ...params.balancesLiveScaled18,
        ]);

        if (
            newTotalImbalance <= oldTotalImbalance ||
            newTotalImbalance <= surgeThresholdPercentage
        ) {
            return staticFeePercentage;
        }

        // surgeFee = staticFee + (maxFee - staticFee) * (pctImbalance - pctThreshold) / (1 - pctThreshold).
        //
        // As you can see from the formula, if it’s unbalanced exactly at the threshold, the last term is 0,
        // and the fee is just: static + 0 = static fee.
        // As the unbalanced proportion term approaches 1, the fee surge approaches: static + max - static ~= max fee.
        // This formula linearly increases the fee from 0 at the threshold up to the maximum fee.
        // At 35%, the fee would be 1% + (0.95 - 0.01) * ((0.35 - 0.3)/(0.95-0.3)) = 1% + 0.94 * 0.0769 ~ 8.2%.
        // At 50% unbalanced, the fee would be 44%. At 99% unbalanced, the fee would be ~94%, very close to the maximum.
        const dynamicSwapFee =
            staticFeePercentage +
            MathSol.mulDownFixed(
                maxSurgeFeePercentage - staticFeePercentage,
                MathSol.divDownFixed(
                    newTotalImbalance - surgeThresholdPercentage,
                    MathSol.complementFixed(surgeThresholdPercentage),
                ),
            );
        return dynamicSwapFee;
    }

    private calculateImbalance(balances: bigint[]): bigint {
        const median = this.findMedian(balances);

        let totalBalance = 0n;
        let totalDiff = 0n;

        for (let i = 0; i < balances.length; i++) {
            totalBalance += balances[i];
            totalDiff += this.absSub(balances[i], median);
        }

        return MathSol.divDownFixed(totalDiff, totalBalance);
    }

    private findMedian(balances: bigint[]): bigint {
        const sortedBalances = balances.sort((a, b) => {
            if (a < b) return -1;
            if (a > b) return 1;
            return 0;
        });
        const mid = Math.floor(sortedBalances.length / 2);

        if (sortedBalances.length % 2 == 0) {
            return (sortedBalances[mid - 1] + sortedBalances[mid]) / 2n;
        } else {
            return sortedBalances[mid];
        }
    }

    private absSub(a: bigint, b: bigint): bigint {
        return a > b ? a - b : b - a;
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

export default StableSurgeHook;

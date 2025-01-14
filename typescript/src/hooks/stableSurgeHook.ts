import { HookBase, HookStateBase } from './types';
import { MathSol, WAD } from '../utils/math';
import { SwapKind, SwapParams } from '../vault/types';
import {
    _computeInvariant,
    _computeOutGivenExactIn,
    _computeInGivenExactOut,
} from '../stable/stableMath';

export type HookStateStableSurge = HookStateBase & {
    amp: bigint;
    surgeThresholdPercentage: bigint;
};

// Implementation from mono-repo commit: c70ec462344223998d8fee74c2455a55a145106d
export class StableSurgeHook implements HookBase {
    public shouldCallComputeDynamicSwapFee = true;
    public shouldCallBeforeSwap = false;
    public shouldCallAfterSwap = false;
    public shouldCallBeforeAddLiquidity = false;
    public shouldCallAfterAddLiquidity = false;
    public shouldCallBeforeRemoveLiquidity = false;
    public shouldCallAfterRemoveLiquidity = false;
    public enableHookAdjustedAmounts = false;

    MAX_SURGE_FEE_PERCENTAGE = BigInt(95e16); // 95%

    onComputeDynamicSwapFee(
        params: SwapParams,
        pool: string,
        staticSwapFeePercentage: bigint,
        hookState: HookStateStableSurge,
    ): { success: boolean; dynamicSwapFee: bigint } {
        const invariant = _computeInvariant(
            hookState.amp,
            params.balancesLiveScaled18,
        );

        let amountCalculatedScaled18: bigint;
        if (params.swapKind === SwapKind.GivenIn) {
            amountCalculatedScaled18 = _computeOutGivenExactIn(
                hookState.amp,
                params.balancesLiveScaled18,
                params.indexIn,
                params.indexOut,
                params.amountGivenScaled18,
                invariant,
            );

            // Swap fee is always a percentage of the amountCalculated. On ExactIn, subtract it from the calculated
            // amountOut. Round up to avoid losses during precision loss.
            const swapFeeAmountScaled18 = MathSol.mulUpFixed(
                amountCalculatedScaled18,
                staticSwapFeePercentage,
            );
            amountCalculatedScaled18 -= swapFeeAmountScaled18;
        } else {
            amountCalculatedScaled18 = _computeInGivenExactOut(
                hookState.amp,
                params.balancesLiveScaled18,
                params.indexIn,
                params.indexOut,
                params.amountGivenScaled18,
                invariant,
            );

            // To ensure symmetry with EXACT_IN, the swap fee used by ExactOut is
            // `amountCalculated * fee% / (100% - fee%)`. Add it to the calculated amountIn. Round up to avoid losses
            // during precision loss.
            const swapFeeAmountScaled18 = MathSol.mulDivUpFixed(
                amountCalculatedScaled18,
                staticSwapFeePercentage,
                MathSol.complementFixed(staticSwapFeePercentage),
            );

            amountCalculatedScaled18 += swapFeeAmountScaled18;
        }

        return {
            success: true,
            dynamicSwapFee: this.getSurgeFeePercentage(
                params,
                amountCalculatedScaled18,
                hookState.surgeThresholdPercentage,
                staticSwapFeePercentage,
            ),
        };
    }

    private getSurgeFeePercentage(
        params: SwapParams,
        amountCalculatedScaled18: bigint,
        surgeThresholdPercentage: bigint,
        staticFeePercentage: bigint,
    ): bigint {
        const numTokens = params.balancesLiveScaled18.length;
        const newBalances = new Array(numTokens).fill(0n);
        for (let i = 0; i < numTokens; ++i) {
            newBalances[i] = params.balancesLiveScaled18[i];

            if (i === params.indexIn) {
                if (params.swapKind === SwapKind.GivenIn) {
                    newBalances[i] += params.amountGivenScaled18;
                } else {
                    newBalances[i] += amountCalculatedScaled18;
                }
            } else if (i === params.indexOut) {
                if (params.swapKind === SwapKind.GivenIn) {
                    newBalances[i] -= amountCalculatedScaled18;
                } else {
                    newBalances[i] -= params.amountGivenScaled18;
                }
            }
        }

        const newTotalImbalance = this.calculateImbalance(newBalances);

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
                this.MAX_SURGE_FEE_PERCENTAGE - staticFeePercentage,
                MathSol.divDownFixed(
                    newTotalImbalance - surgeThresholdPercentage,
                    MathSol.complementFixed(surgeThresholdPercentage),
                ),
            );
        return dynamicSwapFee;
    }

    private calculateImbalance(balances: bigint[]): bigint {
        const median = this.findMedian(balances.sort());

        let totalBalance = 0n;
        let totalDiff = 0n;

        for (let i = 0; i < balances.length; i++) {
            totalBalance += balances[i];
            totalDiff += this.absSub(balances[i], median);
        }

        return (totalDiff * WAD) / totalBalance;
    }

    private findMedian(sortedBalances: bigint[]): bigint {
        const mid = sortedBalances.length / 2;

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

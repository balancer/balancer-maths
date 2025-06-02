import {
    MaxSwapParams,
    type PoolBase,
    SwapKind,
    type SwapParams,
} from '../vault/types';
import { ReClammMutable } from './reClammData';
import {
    computeCurrentVirtualBalances,
    computeInGivenOut,
    computeOutGivenIn,
} from './reClammMath';

export class ReClamm implements PoolBase {
    public reClammState: ReClammMutable;
    constructor(reClammState: ReClammMutable) {
        this.reClammState = reClammState;
    }

    getMaximumInvariantRatio(): bigint {
        // The invariant ratio bounds are required by `IBasePool`, but are unused in this pool type, as liquidity can
        // only be added or removed proportionally.
        return 0n;
    }

    getMinimumInvariantRatio(): bigint {
        // The invariant ratio bounds are required by `IBasePool`, but are unused in this pool type, as liquidity can
        // only be added or removed proportionally.
        return 0n;
    }

    /**
     * Returns the max amount that can be swapped in relation to the swapKind.
     * @param maxSwapParams
     * @returns GivenIn: Returns the max amount in. GivenOut: Returns the max amount out.
     */
    getMaxSwapAmount(maxSwapParams: MaxSwapParams): bigint {
        const { balancesLiveScaled18, indexIn, indexOut, swapKind } =
            maxSwapParams;

        if (swapKind === SwapKind.GivenIn) {
            const computeResult =
                this._computeCurrentVirtualBalances(balancesLiveScaled18);
            const maxAmountIn = computeInGivenOut(
                balancesLiveScaled18,
                computeResult.currentVirtualBalanceA,
                computeResult.currentVirtualBalanceB,
                indexIn,
                indexOut,
                balancesLiveScaled18[indexOut],
            );
            const maxAmountInWithTolerance = maxAmountIn - 10n; // 10 is a tolerance for rounding
            return maxAmountInWithTolerance < 0n
                ? 0n
                : maxAmountInWithTolerance;
        }
        const maxAmountOutWithTolerance = balancesLiveScaled18[indexOut] - 10n; // 10 is a tolerance for rounding
        return maxAmountOutWithTolerance < 0n ? 0n : maxAmountOutWithTolerance;
    }

    getMaxSingleTokenAddAmount(): bigint {
        // liquidity can only be added or removed proportionally.
        return 0n;
    }

    getMaxSingleTokenRemoveAmount(): bigint {
        // liquidity can only be added or removed proportionally.
        return 0n;
    }

    onSwap(swapParams: SwapParams): bigint {
        const {
            swapKind,
            balancesLiveScaled18,
            indexIn,
            indexOut,
            amountGivenScaled18,
        } = swapParams;

        const { currentVirtualBalanceA, currentVirtualBalanceB } =
            this._computeCurrentVirtualBalances(balancesLiveScaled18);

        // In SC it does: if (changed) _setLastVirtualBalances, but we don't need that as lastVirtualBalances isn't relevant going forward

        if (swapKind === SwapKind.GivenIn) {
            const amountCalculatedScaled18 = computeOutGivenIn(
                balancesLiveScaled18,
                currentVirtualBalanceA,
                currentVirtualBalanceB,
                indexIn,
                indexOut,
                amountGivenScaled18,
            );

            return amountCalculatedScaled18;
        }

        const amountCalculatedScaled18 = computeInGivenOut(
            balancesLiveScaled18,
            currentVirtualBalanceA,
            currentVirtualBalanceB,
            indexIn,
            indexOut,
            amountGivenScaled18,
        );

        return amountCalculatedScaled18;
    }

    computeInvariant(): bigint {
        // Only needed for unbalanced liquidity and thats not possible in this pool
        return 0n;
    }

    computeBalance(): bigint {
        // Only needed for unbalanced liquidity and thats not possible in this pool
        return 0n;
    }

    _computeCurrentVirtualBalances(balancesScaled18: bigint[]): {
        currentVirtualBalanceA: bigint;
        currentVirtualBalanceB: bigint;
        changed: boolean;
    } {
        return computeCurrentVirtualBalances(
            this.reClammState.currentTimestamp,
            balancesScaled18,
            this.reClammState.lastVirtualBalances[0],
            this.reClammState.lastVirtualBalances[1],
            this.reClammState.dailyPriceShiftBase,
            this.reClammState.lastTimestamp,
            this.reClammState.centerednessMargin,
            {
                priceRatioUpdateStartTime:
                    this.reClammState.priceRatioUpdateStartTime,
                priceRatioUpdateEndTime:
                    this.reClammState.priceRatioUpdateEndTime,
                startFourthRootPriceRatio:
                    this.reClammState.startFourthRootPriceRatio,
                endFourthRootPriceRatio:
                    this.reClammState.endFourthRootPriceRatio,
            },
        );
    }
}

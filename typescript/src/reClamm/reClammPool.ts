import {
    MaxSwapParams,
    type PoolBase,
    SwapKind,
    type SwapParams,
} from '../vault/types';
import { ReClammMutable } from './reClammData';
import {
    computeCenteredness,
    computeCurrentVirtualBalances,
    computeInGivenOut,
    computeOutGivenIn,
} from './reClammMath';

export class ReClamm implements PoolBase {
    private readonly MIN_TOKEN_BALANCE_SCALED18 = 1000000000000n;
    private readonly MIN_POOL_CENTEREDNESS = 1000n;
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
        const maxAmountOut =
            balancesLiveScaled18[indexOut] - this.MIN_TOKEN_BALANCE_SCALED18;

        if (swapKind === SwapKind.GivenIn) {
            // ComputeInGivenOut, where the amount out is the real balance of the token out - 1e12 (1e12 is the minimum amount of token in this pool).
            // This would give the maximum amount in.
            const computeResult =
                this._computeCurrentVirtualBalances(balancesLiveScaled18);
            const amountCalculatedScaled18 = computeInGivenOut(
                balancesLiveScaled18,
                computeResult.currentVirtualBalanceA,
                computeResult.currentVirtualBalanceB,
                indexIn,
                indexOut,
                maxAmountOut,
            );
            return amountCalculatedScaled18 - 1n;
        }
        return maxAmountOut;
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

        const computeResult =
            this._computeCurrentVirtualBalances(balancesLiveScaled18);

        if (swapKind === SwapKind.GivenIn) {
            const amountCalculatedScaled18 = computeOutGivenIn(
                balancesLiveScaled18,
                computeResult.currentVirtualBalanceA,
                computeResult.currentVirtualBalanceB,
                indexIn,
                indexOut,
                amountGivenScaled18,
            );

            this._ensureValidPoolStateAfterSwap(
                balancesLiveScaled18,
                computeResult.currentVirtualBalanceA,
                computeResult.currentVirtualBalanceB,
                amountGivenScaled18,
                amountCalculatedScaled18,
                indexIn,
                indexOut,
            );

            return amountCalculatedScaled18;
        }

        const amountCalculatedScaled18 = computeInGivenOut(
            balancesLiveScaled18,
            computeResult.currentVirtualBalanceA,
            computeResult.currentVirtualBalanceB,
            indexIn,
            indexOut,
            amountGivenScaled18,
        );

        this._ensureValidPoolStateAfterSwap(
            balancesLiveScaled18,
            computeResult.currentVirtualBalanceA,
            computeResult.currentVirtualBalanceB,
            amountCalculatedScaled18,
            amountGivenScaled18,
            indexIn,
            indexOut,
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
            this.reClammState.priceShiftDailyRateInSeconds,
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

    _ensureValidPoolStateAfterSwap(
        currentBalancesScaled18: bigint[],
        currentVirtualBalanceA: bigint,
        currentVirtualBalanceB: bigint,
        amountInScaled18: bigint,
        amountOutScaled18: bigint,
        indexIn: number,
        indexOut: number,
    ) {
        // Create a copy of the balances array
        const updatedBalances = [...currentBalancesScaled18];
        updatedBalances[indexIn] += amountInScaled18;
        // The swap functions `computeOutGivenIn` and `computeInGivenOut` ensure that the amountOutScaled18 is
        // never greater than the balance of the token being swapped out. Therefore, the math below will never
        // underflow. Nevertheless, since these considerations involve code outside this function, it is safest
        // to still use checked math here.
        updatedBalances[indexOut] -= amountOutScaled18;

        if (updatedBalances[indexOut] < this.MIN_TOKEN_BALANCE_SCALED18) {
            // If one of the token balances is below the minimum, the price ratio update is unreliable.
            throw new Error(`reClammPool: TokenBalanceTooLow`);
        }

        if (
            computeCenteredness(
                updatedBalances,
                currentVirtualBalanceA,
                currentVirtualBalanceB,
            ) < this.MIN_POOL_CENTEREDNESS
        ) {
            // If the pool centeredness is below the minimum, the price ratio update is unreliable.
            throw new Error(`reClammPool: PoolCenterednessTooLow`);
        }
    }
}

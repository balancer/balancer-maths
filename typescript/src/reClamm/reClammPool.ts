import { MAX_BALANCE } from '../constants';
import {
    MaxSwapParams,
    type PoolBase,
    SwapKind,
    type SwapParams,
} from '../vault/types';
import { toRawUndoRateRoundDown } from '../vault/utils';
import { MathSol } from '../utils/math';
import { ReClammState } from './reClammData';
import {
    computeCenteredness,
    computeCurrentVirtualBalances,
    computeInGivenOut,
    computeOutGivenIn,
} from './reClammMath';

export class ReClamm implements PoolBase {
    private readonly MIN_TOKEN_BALANCE_SCALED18 = 1000000000000n;
    private readonly MIN_POOL_CENTEREDNESS = 1000n;
    public reClammState: ReClammState;
    constructor(reClammState: ReClammState) {
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
        // ComputeInGivenOut, where the amount out is the real balance of the token out - 1e12 (1e12 is the minimum amount of token in this pool). 
        // This would give the maximum amount in.
        const {
            balancesLiveScaled18,
            indexIn,
            indexOut,
            tokenRates,
            scalingFactors,
            swapKind,
        } = maxSwapParams;
        if (swapKind === SwapKind.GivenIn) {
            // MAX_BALANCE comes from SC limit and is max pool can hold
            const diff = MAX_BALANCE - balancesLiveScaled18[indexIn];
            // Scale to token in (and remove rate)
            return toRawUndoRateRoundDown(
                diff,
                scalingFactors[indexIn],
                tokenRates[indexIn],
            );
        }
        // 99% of token out balance
        const max = MathSol.mulDownFixed(
            990000000000000000n,
            balancesLiveScaled18[indexOut],
        );
        // Scale to token out
        return toRawUndoRateRoundDown(
            max,
            scalingFactors[indexOut],
            tokenRates[indexOut],
        );
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
        indexOut: number
    ) {
        currentBalancesScaled18[indexIn] += amountInScaled18;
        // The swap functions `computeOutGivenIn` and `computeInGivenOut` ensure that the amountOutScaled18 is
        // never greater than the balance of the token being swapped out. Therefore, the math below will never
        // underflow. Nevertheless, since these considerations involve code outside this function, it is safest
        // to still use checked math here.
        currentBalancesScaled18[indexOut] -= amountOutScaled18;

        if (currentBalancesScaled18[indexOut] < this.MIN_TOKEN_BALANCE_SCALED18) {
            // If one of the token balances is below the minimum, the price ratio update is unreliable.
            throw new Error(`reClammPool: TokenBalanceTooLow`);
        }

        if (
            computeCenteredness(currentBalancesScaled18, currentVirtualBalanceA, currentVirtualBalanceB) <
            this.MIN_POOL_CENTEREDNESS
        ) {
            // If the pool centeredness is below the minimum, the price ratio update is unreliable.
            throw new Error(`reClammPool: PoolCenterednessTooLow`);
        }
    }
}

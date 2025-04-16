import { MAX_BALANCE } from '../constants';
import {
    MaxSwapParams,
    type PoolBase,
    Rounding,
    SwapKind,
    type SwapParams,
} from '../vault/types';
import { toRawUndoRateRoundDown } from '../vault/utils';
import { MathSol } from '../utils/math';
import { ReClammImmutable } from './reClammData';

type PoolParams = {
    test: bigint;
};

export class ReClamm implements PoolBase {
    public poolParams: PoolParams;

    constructor(poolState: ReClammImmutable) {
        this.poolParams = {
            test: 1n,
        };
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
        // const {
        //     swapKind,
        //     balancesLiveScaled18: balancesScaled18,
        //     indexIn,
        //     amountGivenScaled18,
        // } = swapParams;

        // const tokenInIsToken0 = indexIn === 0;


        // const [currentInvariant, invErr] =
        //     GyroECLPMath.calculateInvariantWithError(
        //         balancesScaled18,
        //         eclpParams,
        //         derivedECLPParams,
        //     );
        // // invariant = overestimate in x-component, underestimate in y-component
        // // No overflow in `+` due to constraints to the different values enforced in GyroECLPMath.
        // const invariant: Vector2 = {
        //     x: currentInvariant + 2n * invErr,
        //     y: currentInvariant,
        // };

        // if (swapKind === SwapKind.GivenIn) {
        //     const amountOutScaled18 = GyroECLPMath.calcOutGivenIn(
        //         balancesScaled18,
        //         amountGivenScaled18,
        //         tokenInIsToken0,
        //         eclpParams,
        //         derivedECLPParams,
        //         invariant,
        //     );

        //     return amountOutScaled18;
        // }

        // const amountInScaled18 = GyroECLPMath.calcInGivenOut(
        //     balancesScaled18,
        //     amountGivenScaled18,
        //     tokenInIsToken0,
        //     eclpParams,
        //     derivedECLPParams,
        //     invariant,
        // );

        // return amountInScaled18;
        return 0n;
    }

    computeInvariant(
        balancesLiveScaled18: bigint[],
        rounding: Rounding,
    ): bigint {
        // const { eclpParams, derivedECLPParams } = this.poolParams;
        // const [currentInvariant, invErr] =
        //     GyroECLPMath.calculateInvariantWithError(
        //         balancesLiveScaled18,
        //         eclpParams,
        //         derivedECLPParams,
        //     );

        // if (rounding == Rounding.ROUND_DOWN) {
        //     return currentInvariant - invErr;
        // } else {
        //     return currentInvariant + invErr;
        // }
        return 0n;
    }

    computeBalance(
        balancesLiveScaled18: bigint[],
        tokenInIndex: number,
        invariantRatio: bigint,
    ): bigint {
        return 0n;
    }
}

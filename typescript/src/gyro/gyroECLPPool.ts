import { MAX_UINT256, MAX_BALANCE } from '../constants';
import {
    MaxSingleTokenRemoveParams,
    MaxSwapParams,
    type PoolBase,
    Rounding,
    SwapKind,
    type SwapParams,
} from '../vault/types';
import { toRawUndoRateRoundDown } from '../vault/utils';
import { MathSol } from '../utils/math';
import {
    DerivedEclpParams,
    EclpParams,
    GyroECLPMath,
    Vector2,
} from './gyroECLPMath';
import { GyroECLPImmutable } from './gyroECLPData';

type PoolParams = {
    eclpParams: EclpParams;
    derivedECLPParams: DerivedEclpParams;
};

export class GyroECLP implements PoolBase {
    public poolParams: PoolParams;

    constructor(poolState: GyroECLPImmutable) {
        this.poolParams = {
            eclpParams: {
                alpha: poolState.paramsAlpha,
                beta: poolState.paramsBeta,
                c: poolState.paramsC,
                s: poolState.paramsS,
                lambda: poolState.paramsLambda,
            },
            derivedECLPParams: {
                tauAlpha: {
                    x: poolState.tauAlphaX,
                    y: poolState.tauAlphaY,
                },
                tauBeta: {
                    x: poolState.tauBetaX,
                    y: poolState.tauBetaY,
                },
                u: poolState.u,
                v: poolState.v,
                w: poolState.w,
                z: poolState.z,
                dSq: poolState.dSq,
            },
        };
    }

    getMaximumInvariantRatio(): bigint {
        return GyroECLPMath.MAX_INVARIANT_RATIO;
    }

    getMinimumInvariantRatio(): bigint {
        return GyroECLPMath.MIN_INVARIANT_RATIO;
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
        return MAX_UINT256;
    }

    getMaxSingleTokenRemoveAmount(
        maxRemoveParams: MaxSingleTokenRemoveParams,
    ): bigint {
        const {
            isExactIn,
            totalSupply,
            tokenOutBalance,
            tokenOutScalingFactor,
            tokenOutRate,
        } = maxRemoveParams;
        return this.getMaxSwapAmount({
            swapKind: isExactIn ? SwapKind.GivenIn : SwapKind.GivenOut,
            balancesLiveScaled18: [totalSupply, tokenOutBalance],
            tokenRates: [1000000000000000000n, tokenOutRate],
            scalingFactors: [1000000000000000000n, tokenOutScalingFactor],
            indexIn: 0,
            indexOut: 1,
        });
    }

    onSwap(swapParams: SwapParams): bigint {
        const {
            swapKind,
            balancesLiveScaled18: balancesScaled18,
            indexIn,
            amountGivenScaled18,
        } = swapParams;

        const tokenInIsToken0 = indexIn === 0;

        const { eclpParams, derivedECLPParams } = this.poolParams;

        const [currentInvariant, invErr] =
            GyroECLPMath.calculateInvariantWithError(
                balancesScaled18,
                eclpParams,
                derivedECLPParams,
            );
        // invariant = overestimate in x-component, underestimate in y-component
        // No overflow in `+` due to constraints to the different values enforced in GyroECLPMath.
        const invariant: Vector2 = {
            x: currentInvariant + 2n * invErr,
            y: currentInvariant,
        };

        if (swapKind === SwapKind.GivenIn) {
            const amountOutScaled18 = GyroECLPMath.calcOutGivenIn(
                balancesScaled18,
                amountGivenScaled18,
                tokenInIsToken0,
                eclpParams,
                derivedECLPParams,
                invariant,
            );

            return amountOutScaled18;
        }

        const amountInScaled18 = GyroECLPMath.calcInGivenOut(
            balancesScaled18,
            amountGivenScaled18,
            tokenInIsToken0,
            eclpParams,
            derivedECLPParams,
            invariant,
        );

        return amountInScaled18;
    }

    computeInvariant(
        balancesLiveScaled18: bigint[],
        rounding: Rounding,
    ): bigint {
        const { eclpParams, derivedECLPParams } = this.poolParams;
        const [currentInvariant, invErr] =
            GyroECLPMath.calculateInvariantWithError(
                balancesLiveScaled18,
                eclpParams,
                derivedECLPParams,
            );

        if (rounding == Rounding.ROUND_DOWN) {
            return currentInvariant - invErr;
        } else {
            return currentInvariant + invErr;
        }
    }

    computeBalance(
        balancesLiveScaled18: bigint[],
        tokenInIndex: number,
        invariantRatio: bigint,
    ): bigint {
        const { eclpParams, derivedECLPParams } = this.poolParams;

        const [currentInvariant, invErr] =
            GyroECLPMath.calculateInvariantWithError(
                balancesLiveScaled18,
                eclpParams,
                derivedECLPParams,
            );

        // The invariant vector contains the rounded up and rounded down invariant. Both are needed when computing
        // the virtual offsets. Depending on tauAlpha and tauBeta values, we want to use the invariant rounded up
        // or rounded down to make sure we're conservative in the output.
        const invariant: Vector2 = {
            x: MathSol.mulUpFixed(currentInvariant + invErr, invariantRatio),
            y: MathSol.mulUpFixed(currentInvariant - invErr, invariantRatio),
        };

        // Edge case check. Should never happen except for insane tokens. If this is hit, actually adding the
        // tokens would lead to a revert or (if it went through) a deadlock downstream, so we catch it here.
        if (invariant.x > GyroECLPMath._MAX_INVARIANT)
            throw Error(`GyroECLPMath.MaxInvariantExceeded`);

        if (tokenInIndex === 0) {
            return GyroECLPMath.calcXGivenY(
                balancesLiveScaled18[1],
                eclpParams,
                derivedECLPParams,
                invariant,
            );
        } else {
            return GyroECLPMath.calcYGivenX(
                balancesLiveScaled18[0],
                eclpParams,
                derivedECLPParams,
                invariant,
            );
        }
    }
}

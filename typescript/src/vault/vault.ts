import { MathSol } from '../utils/math';
import {
    computeAddLiquiditySingleTokenExactOut,
    computeAddLiquidityUnbalanced,
    computeProportionalAmountsOut,
    computeRemoveLiquiditySingleTokenExactIn,
    computeRemoveLiquiditySingleTokenExactOut,
} from './basePoolMath';
import { Weighted } from '../weighted';
import { Stable } from '../stable';
import { BufferState, erc4626BufferWrapOrUnwrap } from '../buffer';
import { isSameAddress } from './utils';
import {
    AddKind,
    AddLiquidityInput,
    PoolBase,
    PoolState,
    RemoveKind,
    RemoveLiquidityInput,
    SwapInput,
    SwapKind,
    SwapParams,
} from './types';
import { HookBase, HookClassConstructor, HookState } from '../hooks/types';
import { defaultHook } from '../hooks/constants';


// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PoolClassConstructor = new (..._args: any[]) => PoolBase;
type PoolClasses = Readonly<Record<string, PoolClassConstructor>>;
export type HookClasses = Readonly<Record<string, HookClassConstructor>>;

export class Vault {
    private readonly poolClasses: PoolClasses = {} as const;
    private readonly hookClasses: HookClasses = {} as const;

    constructor(config?: {
        customPoolClasses?: PoolClasses;
        customHookClasses?: HookClasses;
    }) {
        const { customPoolClasses, customHookClasses: hookClasses } =
            config || {};
        this.poolClasses = {
            Weighted: Weighted,
            Stable: Stable,
            // custom add liquidity types take precedence over base types
            ...customPoolClasses,
        };
        this.hookClasses = {
            // custom hooks take precedence over base types
            ...hookClasses,
        };
    }

    public getPool(poolState: PoolState): PoolBase {
        const poolClass = this.poolClasses[poolState.poolType];
        if (!poolClass)
            throw new Error(`Unsupported Pool Type: ${poolState.poolType}`);
        return new poolClass(poolState);
    }

    public getHook(hookName?: string, hookState?: HookState): HookBase {
        if (!hookName) return defaultHook;
        const hookClass = this.hookClasses[hookName];
        if (!hookClass) throw new Error(`Unsupported Hook Type: ${hookName}`);
        if (!hookState) throw new Error(`No state for Hook: ${hookName}`);
        return new hookClass(hookState);
    }

    public swap(
        input: SwapInput,
        poolState: PoolState | BufferState,
        hookState?: HookState,
    ): bigint {
        if ((poolState as BufferState).poolType === 'Buffer') {
            return erc4626BufferWrapOrUnwrap(input, poolState as BufferState);
        }

        const pool = this.getPool(poolState as PoolState);
        const hook = this.getHook((poolState as PoolState).hookType, hookState);

        const inputIndex = poolState.tokens.findIndex((t) =>
            isSameAddress(input.tokenIn, t),
        );
        if (inputIndex === -1) throw Error('Input token not found on pool');

        const outputIndex = poolState.tokens.findIndex((t) =>
            isSameAddress(input.tokenOut, t),
        );
        if (outputIndex === -1) throw Error('Output token not found on pool');

        const amountGivenScaled18 = this._updateAmountGivenInVars(
            input.amountRaw,
            input.swapKind,
            inputIndex,
            outputIndex,
            (poolState as PoolState).scalingFactors,
            (poolState as PoolState).tokenRates,
        );

        // hook: shouldCallBeforeSwap (TODO - need to handle balance changes, etc see code)
        if (hook.shouldCallBeforeSwap) {
            throw new Error('Hook Unsupported: shouldCallBeforeSwap');
        }

        // hook: dynamicSwapFee
        if (hook.shouldCallComputeDynamicSwapFee) {
            throw new Error(
                'Hook Unsupported: shouldCallComputeDynamicSwapFee',
            );
        }

        // _swap()
        const swapParams: SwapParams = {
            swapKind: input.swapKind,
            amountGivenScaled18,
            balancesLiveScaled18: (poolState as PoolState).balancesLiveScaled18,
            indexIn: inputIndex,
            indexOut: outputIndex,
        };

        let amountCalculatedScaled18 = pool.onSwap(swapParams);

        // Set swapFeeAmountScaled18 based on the amountCalculated.
        let swapFeeAmountScaled18 = 0n;
        if ((poolState as PoolState).swapFee > 0) {
            // Swap fee is always a percentage of the amountCalculated. On ExactIn, subtract it from the calculated
            // amountOut. On ExactOut, add it to the calculated amountIn.
            // Round up to avoid losses during precision loss.
            swapFeeAmountScaled18 = MathSol.mulUpFixed(
                amountCalculatedScaled18,
                (poolState as PoolState).swapFee,
            );
        }

        let amountCalculated = 0n;
        if (input.swapKind === SwapKind.GivenIn) {
            amountCalculatedScaled18 -= swapFeeAmountScaled18;

            // For `ExactIn` the amount calculated is leaving the Vault, so we round down.
            amountCalculated = this._toRawUndoRateRoundDown(
                amountCalculatedScaled18,
                (poolState as PoolState).scalingFactors[outputIndex],
                (poolState as PoolState).tokenRates[outputIndex],
            );
        } else {
            amountCalculatedScaled18 += swapFeeAmountScaled18;

            // For `ExactOut` the amount calculated is entering the Vault, so we round up.
            amountCalculated = this._toRawUndoRateRoundUp(
                amountCalculatedScaled18,
                (poolState as PoolState).scalingFactors[inputIndex],
                (poolState as PoolState).tokenRates[inputIndex],
            );
        }

        // TODO - Depending on hook implementation we may need to alter the logic for handling amounts, etc
        // hook: after swap
        if (hook.shouldCallAfterSwap) {
            throw new Error('Hook Unsupported: shouldCallAfterSwap');
        }

        return amountCalculated;
    }

    public addLiquidity(
        input: AddLiquidityInput,
        poolState: PoolState,
        hookState?: HookState,
    ): { amountsIn: bigint[]; bptAmountOut: bigint } {
        if (poolState.poolType === 'Buffer')
            throw Error('Buffer pools do not support addLiquidity');

        const pool = this.getPool(poolState);
        const hook = this.getHook((poolState as PoolState).hookType, hookState);

        // Amounts are entering pool math, so round down.
        // Introducing amountsInScaled18 here and passing it through to _addLiquidity is not ideal,
        // but it avoids the even worse options of mutating amountsIn inside AddLiquidityParams,
        // or cluttering the AddLiquidityParams interface by adding amountsInScaled18.
        const maxAmountsInScaled18 =
            this._copyToScaled18ApplyRateRoundDownArray(
                input.maxAmountsIn,
                poolState.scalingFactors,
                poolState.tokenRates,
            );

        // hook: shouldCallBeforeAddLiquidity (TODO - need to handle balance changes, etc see code)
        if (hook.shouldCallBeforeAddLiquidity) {
            throw new Error('Hook Unsupported: shouldCallBeforeAddLiquidity');
        }

        let amountsInScaled18: bigint[];
        let bptAmountOut: bigint;
        if (input.kind === AddKind.UNBALANCED) {
            amountsInScaled18 = maxAmountsInScaled18;
            const computed = computeAddLiquidityUnbalanced(
                poolState.balancesLiveScaled18,
                maxAmountsInScaled18,
                poolState.totalSupply,
                poolState.swapFee,
                (balancesLiveScaled18) =>
                    pool.computeInvariant(balancesLiveScaled18),
            );
            bptAmountOut = computed.bptAmountOut;
        } else if (input.kind === AddKind.SINGLE_TOKEN_EXACT_OUT) {
            const tokenIndex = this._getSingleInputIndex(maxAmountsInScaled18);
            amountsInScaled18 = maxAmountsInScaled18;
            bptAmountOut = input.minBptAmountOut;
            const computed = computeAddLiquiditySingleTokenExactOut(
                poolState.balancesLiveScaled18,
                tokenIndex,
                bptAmountOut,
                poolState.totalSupply,
                poolState.swapFee,
                (balancesLiveScaled18, tokenIndex, invariantRatio) =>
                    pool.computeBalance(
                        balancesLiveScaled18,
                        tokenIndex,
                        invariantRatio,
                    ),
            );
            amountsInScaled18[tokenIndex] = computed.amountInWithFee;
        } else throw new Error('Unsupported AddLiquidity Kind');

        const amountsInRaw: bigint[] = new Array(poolState.tokens.length);
        for (let i = 0; i < poolState.tokens.length; i++) {
            // amountsInRaw are amounts actually entering the Pool, so we round up.
            amountsInRaw[i] = this._toRawUndoRateRoundUp(
                amountsInScaled18[i],
                poolState.scalingFactors[i],
                poolState.tokenRates[i],
            );
        }

        // hook: shouldCallAfterAddLiquidity
        if (hook.shouldCallAfterAddLiquidity) {
            throw new Error('Hook Unsupported: shouldCallAfterAddLiquidity');
        }

        return {
            amountsIn: amountsInRaw,
            bptAmountOut: bptAmountOut,
        };
    }

    public removeLiquidity(
        input: RemoveLiquidityInput,
        poolState: PoolState,
        hookState?: HookState,
    ): { amountsOut: bigint[]; bptAmountIn: bigint } {
        if (poolState.poolType === 'Buffer')
            throw Error('Buffer pools do not support removeLiquidity');

        const pool = this.getPool(poolState);
        const hook = this.getHook((poolState as PoolState).hookType, hookState);

        // Round down when removing liquidity:
        // If proportional, lower balances = lower proportional amountsOut, favoring the pool.
        // If unbalanced, lower balances = lower invariant ratio without fees.
        // bptIn = supply * (1 - ratio), so lower ratio = more bptIn, favoring the pool.

        // Amounts are entering pool math; higher amounts would burn more BPT, so round up to favor the pool.
        // Do not mutate minAmountsOut, so that we can directly compare the raw limits later, without potentially
        // losing precision by scaling up and then down.
        const minAmountsOutScaled18 = this._copyToScaled18ApplyRateRoundUpArray(
            input.minAmountsOut,
            poolState.scalingFactors,
            poolState.tokenRates,
        );

        // hook: shouldCallBeforeRemoveLiquidity (TODO - need to handle balance changes, etc see code)
        if (hook.shouldCallBeforeRemoveLiquidity) {
            throw new Error(
                'Hook Unsupported: shouldCallBeforeRemoveLiquidity',
            );
        }

        let tokenOutIndex: number;
        let bptAmountIn: bigint;
        let amountsOutScaled18: bigint[];

        if (input.kind === RemoveKind.PROPORTIONAL) {
            bptAmountIn = input.maxBptAmountIn;
            amountsOutScaled18 = computeProportionalAmountsOut(
                poolState.balancesLiveScaled18,
                poolState.totalSupply,
                input.maxBptAmountIn,
            );
        } else if (input.kind === RemoveKind.SINGLE_TOKEN_EXACT_IN) {
            bptAmountIn = input.maxBptAmountIn;
            amountsOutScaled18 = minAmountsOutScaled18;
            tokenOutIndex = this._getSingleInputIndex(input.minAmountsOut);
            const computed = computeRemoveLiquiditySingleTokenExactIn(
                poolState.balancesLiveScaled18,
                tokenOutIndex,
                input.maxBptAmountIn,
                poolState.totalSupply,
                poolState.swapFee,
                (balancesLiveScaled18, tokenIndex, invariantRatio) =>
                    pool.computeBalance(
                        balancesLiveScaled18,
                        tokenIndex,
                        invariantRatio,
                    ),
            );
            amountsOutScaled18[tokenOutIndex] = computed.amountOutWithFee;
        } else if (input.kind === RemoveKind.SINGLE_TOKEN_EXACT_OUT) {
            amountsOutScaled18 = minAmountsOutScaled18;
            tokenOutIndex = this._getSingleInputIndex(input.minAmountsOut);
            const computed = computeRemoveLiquiditySingleTokenExactOut(
                poolState.balancesLiveScaled18,
                tokenOutIndex,
                amountsOutScaled18[tokenOutIndex],
                poolState.totalSupply,
                poolState.swapFee,
                (balancesLiveScaled18) =>
                    pool.computeInvariant(balancesLiveScaled18),
            );
            bptAmountIn = computed.bptAmountIn;
        } else throw new Error('Unsupported RemoveLiquidity Kind');

        const amountsOutRaw = new Array(poolState.tokens.length);

        for (let i = 0; i < poolState.tokens.length; ++i) {
            // amountsOut are amounts exiting the Pool, so we round down.
            amountsOutRaw[i] = this._toRawUndoRateRoundDown(
                amountsOutScaled18[i],
                poolState.scalingFactors[i],
                poolState.tokenRates[i],
            );
        }

        // hook: shouldCallAfterRemoveLiquidity
        if (hook.shouldCallAfterRemoveLiquidity) {
            throw new Error('Hook Unsupported: shouldCallAfterRemoveLiquidity');
        }

        return {
            amountsOut: amountsOutRaw,
            bptAmountIn,
        };
    }

    private _getSingleInputIndex(maxAmountsIn: bigint[]): number {
        const length = maxAmountsIn.length;
        let inputIndex = length;

        for (let i = 0; i < length; ++i) {
            if (maxAmountsIn[i] !== 0n) {
                if (inputIndex !== length) {
                    throw new Error(
                        'Multiple non-zero inputs for single token add',
                    );
                }
                inputIndex = i;
            }
        }

        if (inputIndex >= length) {
            throw new Error('All zero inputs for single token add');
        }

        return inputIndex;
    }

    /**
     * @dev Same as `toScaled18ApplyRateRoundDown`, but returns a new array, leaving the original intact.
     */
    private _copyToScaled18ApplyRateRoundDownArray(
        amounts: bigint[],
        scalingFactors: bigint[],
        tokenRates: bigint[],
    ): bigint[] {
        return amounts.map((a, i) =>
            this._toScaled18ApplyRateRoundDown(
                a,
                scalingFactors[i],
                tokenRates[i],
            ),
        );
    }

    /**
     * @dev Same as `toScaled18ApplyRateRoundDown`, but returns a new array, leaving the original intact.
     */
    private _copyToScaled18ApplyRateRoundUpArray(
        amounts: bigint[],
        scalingFactors: bigint[],
        tokenRates: bigint[],
    ): bigint[] {
        return amounts.map((a, i) =>
            this._toScaled18ApplyRateRoundUp(
                a,
                scalingFactors[i],
                tokenRates[i],
            ),
        );
    }

    private _updateAmountGivenInVars(
        amountGivenRaw: bigint,
        swapKind: SwapKind,
        indexIn: number,
        indexOut: number,
        scalingFactors: bigint[],
        tokenRates: bigint[],
    ): bigint {
        // If the amountGiven is entering the pool math (ExactIn), round down, since a lower apparent amountIn leads
        // to a lower calculated amountOut, favoring the pool.
        const amountGivenScaled18 =
            swapKind === SwapKind.GivenIn
                ? this._toScaled18ApplyRateRoundDown(
                      amountGivenRaw,
                      scalingFactors[indexIn],
                      tokenRates[indexIn],
                  )
                : this._toScaled18ApplyRateRoundUp(
                      amountGivenRaw,
                      scalingFactors[indexOut],
                      tokenRates[indexOut],
                  );
        return amountGivenScaled18;
    }

    /**
     * @dev Reverses the `scalingFactor` and `tokenRate` applied to `amount`, resulting in a smaller or equal value
     * depending on whether it needed scaling/rate adjustment or not. The result is rounded down.
     */
    private _toRawUndoRateRoundDown(
        amount: bigint,
        scalingFactor: bigint,
        tokenRate: bigint,
    ): bigint {
        // Do division last, and round scalingFactor * tokenRate up to divide by a larger number.
        return MathSol.divDownFixed(
            amount,
            MathSol.mulUpFixed(scalingFactor, tokenRate),
        );
    }

    /**
     * @dev Reverses the `scalingFactor` and `tokenRate` applied to `amount`, resulting in a smaller or equal value
     * depending on whether it needed scaling/rate adjustment or not. The result is rounded up.
     */
    private _toRawUndoRateRoundUp(
        amount: bigint,
        scalingFactor: bigint,
        tokenRate: bigint,
    ): bigint {
        // Do division last, and round scalingFactor * tokenRate down to divide by a smaller number.
        return MathSol.divUpFixed(
            amount,
            MathSol.mulDownFixed(scalingFactor, tokenRate),
        );
    }

    /**
     * @dev Applies `scalingFactor` and `tokenRate` to `amount`, resulting in a larger or equal value depending on
     * whether it needed scaling/rate adjustment or not. The result is rounded down.
     */
    private _toScaled18ApplyRateRoundDown(
        amount: bigint,
        scalingFactor: bigint,
        tokenRate: bigint,
    ): bigint {
        return MathSol.mulDownFixed(
            MathSol.mulDownFixed(amount, scalingFactor),
            tokenRate,
        );
    }

    /**
     * @dev Applies `scalingFactor` and `tokenRate` to `amount`, resulting in a larger or equal value depending on
     * whether it needed scaling/rate adjustment or not. The result is rounded up.
     */
    private _toScaled18ApplyRateRoundUp(
        amount: bigint,
        scalingFactor: bigint,
        tokenRate: bigint,
    ): bigint {
        return MathSol.mulUpFixed(
            MathSol.mulUpFixed(amount, scalingFactor),
            tokenRate,
        );
    }
}

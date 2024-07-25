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

    public getHook(
        hookName?: string,
        hookState?: HookState | unknown,
    ): HookBase {
        if (!hookName) return defaultHook;
        const hookClass = this.hookClasses[hookName];
        if (!hookClass) throw new Error(`Unsupported Hook Type: ${hookName}`);
        if (!hookState) throw new Error(`No state for Hook: ${hookName}`);
        return new hookClass(hookState);
    }

    public swap(
        input: SwapInput,
        poolState: PoolState | BufferState,
        hookState?: HookState | unknown,
    ): bigint {
        // buffer is handled separately than a "normal" pool
        if (!('totalSupply' in poolState)) {
            return erc4626BufferWrapOrUnwrap(input, poolState);
        }

        const pool = this.getPool(poolState);
        const hook = this.getHook(poolState.hookType, hookState);

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
            poolState.scalingFactors,
            poolState.tokenRates,
        );

        const updatedBalancesLiveScaled18 = [...poolState.balancesLiveScaled18];
        if (hook.shouldCallBeforeSwap) {
            /* 
            Note - in SC balances and amounts are updated to reflect any rate change.
            Daniel said we should not worry about this as any large rate changes will mean something has gone wrong.
            We do take into account and balance changes due to hook using hookAdjustedBalancesScaled18.
            */
            const { success, hookAdjustedBalancesScaled18 } = hook.onBeforeSwap(
                {
                    ...input,
                    hookState,
                },
            );
            if (!success) throw new Error('BeforeSwapHookFailed');
            hookAdjustedBalancesScaled18.forEach(
                (a, i) => (updatedBalancesLiveScaled18[i] = a),
            );
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
            balancesLiveScaled18: updatedBalancesLiveScaled18,
            indexIn: inputIndex,
            indexOut: outputIndex,
        };

        let amountCalculatedScaled18 = pool.onSwap(swapParams);

        // Set swapFeeAmountScaled18 based on the amountCalculated.
        let swapFeeAmountScaled18 = 0n;
        if (poolState.swapFee > 0) {
            // Swap fee is always a percentage of the amountCalculated. On ExactIn, subtract it from the calculated
            // amountOut. On ExactOut, add it to the calculated amountIn.
            // Round up to avoid losses during precision loss.
            swapFeeAmountScaled18 = MathSol.mulUpFixed(
                amountCalculatedScaled18,
                poolState.swapFee,
            );
        }

        let amountCalculatedRaw = 0n;
        if (input.swapKind === SwapKind.GivenIn) {
            amountCalculatedScaled18 -= swapFeeAmountScaled18;

            // For `ExactIn` the amount calculated is leaving the Vault, so we round down.
            amountCalculatedRaw = this._toRawUndoRateRoundDown(
                amountCalculatedScaled18,
                poolState.scalingFactors[outputIndex],
                poolState.tokenRates[outputIndex],
            );
        } else {
            amountCalculatedScaled18 += swapFeeAmountScaled18;

            // For `ExactOut` the amount calculated is entering the Vault, so we round up.
            amountCalculatedRaw = this._toRawUndoRateRoundUp(
                amountCalculatedScaled18,
                poolState.scalingFactors[inputIndex],
                poolState.tokenRates[inputIndex],
            );
        }

        const aggregateSwapFeeAmountScaled18 =
            this._computeAndChargeAggregateSwapFees(
                swapFeeAmountScaled18,
                poolState.aggregateSwapFee,
            );

        // For ExactIn, we increase the tokenIn balance by `amountIn`, and decrease the tokenOut balance by the
        // (`amountOut` + fees).
        // For ExactOut, we increase the tokenInBalance by (`amountIn` - fees), and decrease the tokenOut balance by
        // `amountOut`.
        const locals = {
            balanceInIncrement: 0n,
            balanceOutDecrement: 0n,
        };

        // Perform the conditional assignment using destructuring
        [locals.balanceInIncrement, locals.balanceOutDecrement] =
            input.swapKind === SwapKind.GivenIn
                ? [
                      amountGivenScaled18,
                      amountCalculatedScaled18 + aggregateSwapFeeAmountScaled18,
                  ]
                : [
                      amountCalculatedScaled18 - aggregateSwapFeeAmountScaled18,
                      amountGivenScaled18,
                  ];

        updatedBalancesLiveScaled18[inputIndex] += locals.balanceInIncrement;
        updatedBalancesLiveScaled18[outputIndex] -= locals.balanceOutDecrement;

        if (hook.shouldCallAfterSwap) {
            const { success, hookAdjustedAmountCalculatedRaw } =
                hook.onAfterSwap({
                    kind: input.swapKind,
                    tokenIn: input.tokenIn,
                    tokenOut: input.tokenOut,
                    amountInScaled18:
                        input.swapKind === SwapKind.GivenIn
                            ? amountGivenScaled18
                            : amountCalculatedScaled18,
                    amountOutScaled18:
                        input.swapKind === SwapKind.GivenIn
                            ? amountCalculatedScaled18
                            : amountGivenScaled18,
                    tokenInBalanceScaled18:
                        updatedBalancesLiveScaled18[inputIndex],
                    tokenOutBalanceScaled18:
                        updatedBalancesLiveScaled18[outputIndex],
                    amountCalculatedScaled18: amountCalculatedScaled18,
                    amountCalculatedRaw: amountCalculatedRaw,
                    hookState: hookState,
                });
            if (success === false) {
                throw new Error(
                    `AfterAddSwapHookFailed ${poolState.poolType} ${poolState.hookType}`,
                );
            }
            // If hook adjusted amounts is not enabled, ignore amount returned by the hook
            if (hook.enableHookAdjustedAmounts)
                amountCalculatedRaw = hookAdjustedAmountCalculatedRaw;
        }

        return amountCalculatedRaw;
    }

    public addLiquidity(
        input: AddLiquidityInput,
        poolState: PoolState,
        hookState?: HookState | unknown,
    ): { amountsIn: bigint[]; bptAmountOut: bigint } {
        if (poolState.poolType === 'Buffer')
            throw Error('Buffer pools do not support addLiquidity');

        const pool = this.getPool(poolState);
        const hook = this.getHook(poolState.hookType, hookState);

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

        const updatedBalancesLiveScaled18 = [...poolState.balancesLiveScaled18];

        if (hook.shouldCallBeforeAddLiquidity) {
            /* 
            Note - in SC balances and amounts are updated to reflect any rate change.
            Daniel said we should not worry about this as any large rate changes will mean something has gone wrong.
            We do take into account and balance changes due to hook using hookAdjustedBalancesScaled18.
            */
            const { success, hookAdjustedBalancesScaled18 } =
                hook.onBeforeAddLiquidity(
                    input.kind,
                    input.maxAmountsIn,
                    input.minBptAmountOut,
                    updatedBalancesLiveScaled18,
                    hookState,
                );
            if (!success) throw new Error('BeforeAddLiquidityHookFailed');
            hookAdjustedBalancesScaled18.forEach(
                (a, i) => (updatedBalancesLiveScaled18[i] = a),
            );
        }

        let amountsInScaled18: bigint[];
        let bptAmountOut: bigint;
        let swapFeeAmountsScaled18: bigint[];

        if (input.kind === AddKind.UNBALANCED) {
            amountsInScaled18 = maxAmountsInScaled18;
            const computed = computeAddLiquidityUnbalanced(
                updatedBalancesLiveScaled18,
                maxAmountsInScaled18,
                poolState.totalSupply,
                poolState.swapFee,
                (balancesLiveScaled18) =>
                    pool.computeInvariant(balancesLiveScaled18),
            );
            bptAmountOut = computed.bptAmountOut;
            swapFeeAmountsScaled18 = computed.swapFeeAmounts;
        } else if (input.kind === AddKind.SINGLE_TOKEN_EXACT_OUT) {
            const tokenIndex = this._getSingleInputIndex(maxAmountsInScaled18);
            amountsInScaled18 = maxAmountsInScaled18;
            bptAmountOut = input.minBptAmountOut;
            const computed = computeAddLiquiditySingleTokenExactOut(
                updatedBalancesLiveScaled18,
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
            swapFeeAmountsScaled18 = computed.swapFeeAmounts;
        } else throw new Error('Unsupported AddLiquidity Kind');

        const amountsInRaw: bigint[] = new Array(poolState.tokens.length);
        for (let i = 0; i < poolState.tokens.length; i++) {
            // amountsInRaw are amounts actually entering the Pool, so we round up.
            amountsInRaw[i] = this._toRawUndoRateRoundUp(
                amountsInScaled18[i],
                poolState.scalingFactors[i],
                poolState.tokenRates[i],
            );

            // A Pool's token balance always decreases after an exit
            // Computes protocol and pool creator fee which is eventually taken from pool balance
            const aggregateSwapFeeAmountScaled18 =
                this._computeAndChargeAggregateSwapFees(
                    swapFeeAmountsScaled18[i],
                    poolState.aggregateSwapFee,
                );

            updatedBalancesLiveScaled18[i] =
                updatedBalancesLiveScaled18[i] +
                amountsInScaled18[i] -
                aggregateSwapFeeAmountScaled18;
        }

        if (hook.shouldCallAfterAddLiquidity) {
            const { success, hookAdjustedAmountsInRaw } =
                hook.onAfterAddLiquidity(
                    input.kind,
                    amountsInScaled18,
                    amountsInRaw,
                    bptAmountOut,
                    updatedBalancesLiveScaled18,
                    hookState,
                );

            if (
                success === false ||
                hookAdjustedAmountsInRaw.length != amountsInRaw.length
            ) {
                throw new Error(
                    `AfterAddLiquidityHookFailed ${poolState.poolType} ${poolState.hookType}`,
                );
            }

            // If hook adjusted amounts is not enabled, ignore amounts returned by the hook
            if (hook.enableHookAdjustedAmounts)
                hookAdjustedAmountsInRaw.forEach(
                    (a, i) => (amountsInRaw[i] = a),
                );
        }

        return {
            amountsIn: amountsInRaw,
            bptAmountOut: bptAmountOut,
        };
    }

    public removeLiquidity(
        input: RemoveLiquidityInput,
        poolState: PoolState,
        hookState?: HookState | unknown,
    ): { amountsOut: bigint[]; bptAmountIn: bigint } {
        if (poolState.poolType === 'Buffer')
            throw Error('Buffer pools do not support removeLiquidity');

        const pool = this.getPool(poolState);
        const hook = this.getHook(poolState.hookType, hookState);

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

        const updatedBalancesLiveScaled18 = [...poolState.balancesLiveScaled18];
        if (hook.shouldCallBeforeRemoveLiquidity) {
            /* 
            Note - in SC balances and amounts are updated to reflect any rate change.
            Daniel said we should not worry about this as any large rate changes will mean something has gone wrong.
            We do take into account and balance changes due to hook using hookAdjustedBalancesScaled18.
            */
            const { success, hookAdjustedBalancesScaled18 } =
                hook.onBeforeRemoveLiquidity(
                    input.kind,
                    input.maxBptAmountIn,
                    input.minAmountsOut,
                    updatedBalancesLiveScaled18,
                    hookState,
                );
            if (!success) throw new Error('BeforeRemoveLiquidityHookFailed');
            hookAdjustedBalancesScaled18.forEach(
                (a, i) => (updatedBalancesLiveScaled18[i] = a),
            );
        }

        let tokenOutIndex: number;
        let bptAmountIn: bigint;
        let amountsOutScaled18: bigint[];
        let swapFeeAmountsScaled18: bigint[];

        if (input.kind === RemoveKind.PROPORTIONAL) {
            bptAmountIn = input.maxBptAmountIn;
            swapFeeAmountsScaled18 = new Array(poolState.tokens.length).fill(
                0n,
            );
            amountsOutScaled18 = computeProportionalAmountsOut(
                updatedBalancesLiveScaled18,
                poolState.totalSupply,
                input.maxBptAmountIn,
            );
        } else if (input.kind === RemoveKind.SINGLE_TOKEN_EXACT_IN) {
            bptAmountIn = input.maxBptAmountIn;
            amountsOutScaled18 = minAmountsOutScaled18;
            tokenOutIndex = this._getSingleInputIndex(input.minAmountsOut);
            const computed = computeRemoveLiquiditySingleTokenExactIn(
                updatedBalancesLiveScaled18,
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
            swapFeeAmountsScaled18 = computed.swapFeeAmounts;
        } else if (input.kind === RemoveKind.SINGLE_TOKEN_EXACT_OUT) {
            amountsOutScaled18 = minAmountsOutScaled18;
            tokenOutIndex = this._getSingleInputIndex(input.minAmountsOut);
            const computed = computeRemoveLiquiditySingleTokenExactOut(
                updatedBalancesLiveScaled18,
                tokenOutIndex,
                amountsOutScaled18[tokenOutIndex],
                poolState.totalSupply,
                poolState.swapFee,
                (balancesLiveScaled18) =>
                    pool.computeInvariant(balancesLiveScaled18),
            );
            bptAmountIn = computed.bptAmountIn;
            swapFeeAmountsScaled18 = computed.swapFeeAmounts;
        } else throw new Error('Unsupported RemoveLiquidity Kind');

        const amountsOutRaw = new Array(poolState.tokens.length);

        for (let i = 0; i < poolState.tokens.length; ++i) {
            // amountsOut are amounts exiting the Pool, so we round down.
            amountsOutRaw[i] = this._toRawUndoRateRoundDown(
                amountsOutScaled18[i],
                poolState.scalingFactors[i],
                poolState.tokenRates[i],
            );

            // A Pool's token balance always decreases after an exit
            // Computes protocol and pool creator fee which is eventually taken from pool balance
            const aggregateSwapFeeAmountScaled18 =
                this._computeAndChargeAggregateSwapFees(
                    swapFeeAmountsScaled18[i],
                    poolState.aggregateSwapFee,
                );

            updatedBalancesLiveScaled18[i] =
                updatedBalancesLiveScaled18[i] -
                (amountsOutScaled18[i] + aggregateSwapFeeAmountScaled18);
        }

        // AmountsOut can be changed by onAfterRemoveLiquidity if the hook charges fees or gives discounts
        if (hook.shouldCallAfterRemoveLiquidity) {
            const { success, hookAdjustedAmountsOutRaw } =
                hook.onAfterRemoveLiquidity(
                    input.kind,
                    bptAmountIn,
                    amountsOutScaled18,
                    amountsOutRaw,
                    updatedBalancesLiveScaled18,
                    hookState,
                );

            if (
                success === false ||
                hookAdjustedAmountsOutRaw.length != amountsOutRaw.length
            ) {
                throw new Error(
                    `AfterRemoveLiquidityHookFailed ${poolState.poolType} ${poolState.hookType}`,
                );
            }

            // If hook adjusted amounts is not enabled, ignore amounts returned by the hook
            if (hook.enableHookAdjustedAmounts)
                hookAdjustedAmountsOutRaw.forEach(
                    (a, i) => (amountsOutRaw[i] = a),
                );
        }

        return {
            amountsOut: amountsOutRaw,
            bptAmountIn,
        };
    }

    private _computeAndChargeAggregateSwapFees(
        swapFeeAmountScaled18: bigint,
        aggregateSwapFeePercentage: bigint,
    ): bigint {
        if (swapFeeAmountScaled18 > 0 && aggregateSwapFeePercentage > 0) {
            return MathSol.mulUpFixed(
                swapFeeAmountScaled18,
                aggregateSwapFeePercentage,
            );
        }
        return 0n;
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

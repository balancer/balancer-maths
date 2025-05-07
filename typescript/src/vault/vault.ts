import { MathSol, WAD } from '../utils/math';
import {
    computeAddLiquiditySingleTokenExactOut,
    computeAddLiquidityUnbalanced,
    computeProportionalAmountsOut,
    computeRemoveLiquiditySingleTokenExactIn,
    computeRemoveLiquiditySingleTokenExactOut,
} from './basePoolMath';
import { Weighted } from '../weighted';
import { Stable } from '../stable';
import { GyroECLP } from '../gyro';
import { ReClamm } from '../reClamm';
import { QuantAmm } from '../quantAmm';
import { LiquidityBootstrapping } from '../liquidityBootstrapping';

import { BufferState, erc4626BufferWrapOrUnwrap } from '../buffer';
import {
    isSameAddress,
    toRawUndoRateRoundDown,
    toRawUndoRateRoundUp,
    toScaled18ApplyRateRoundDown,
    toScaled18ApplyRateRoundUp,
} from './utils';
import {
    AddKind,
    AddLiquidityInput,
    MaxSingleTokenRemoveParams,
    MaxSwapParams,
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
import { ExitFeeHook } from '../hooks/exitFeeHook';
import { DirectionalFeeHook } from '../hooks/directionalFeeHook';
import { StableSurgeHook } from '../hooks/stableSurgeHook';

const _MINIMUM_TRADE_AMOUNT = 1e6;
// const _MINIMUM_WRAP_AMOUNT = 1e3;

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
            WEIGHTED: Weighted,
            STABLE: Stable,
            GYROE: GyroECLP,
            RECLAMM: ReClamm,
            LIQUIDITY_BOOTSTRAPPING: LiquidityBootstrapping,
            QUANT_AMM_WEIGHTED: QuantAmm,
            // custom add liquidity types take precedence over base types
            ...customPoolClasses,
        };
        this.hookClasses = {
            ExitFee: ExitFeeHook,
            DirectionalFee: DirectionalFeeHook,
            StableSurge: StableSurgeHook,
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

    /**
     * Returns the max amount that can be swapped (in relation to the amount specified by user).
     * @param maxSwapParams
     * @returns Returned amount/scaling is respective to the tokenOut because that’s what we’re taking out of the pool and what limits the swap size.
     */
    getMaxSwapAmount(swapParams: MaxSwapParams, poolState: PoolState): bigint {
        const pool = this.getPool(poolState);
        return pool.getMaxSwapAmount(swapParams);
    }

    /**
     * Returns the max amount of a single token that can be added to a pool.
     * @param poolState
     * @returns
     */
    getMaxSingleTokenAddAmount(poolState: PoolState): bigint {
        const pool = this.getPool(poolState);
        return pool.getMaxSingleTokenAddAmount();
    }

    /**
     * Returns the max amount of a single token that can be removed from a pool.
     * @param maxRemoveParams
     * @param poolState
     * @returns
     */
    getMaxSingleTokenRemoveAmount(
        maxRemoveParams: MaxSingleTokenRemoveParams,
        poolState: PoolState,
    ): bigint {
        const pool = this.getPool(poolState);
        return pool.getMaxSingleTokenRemoveAmount(maxRemoveParams);
    }

    /**
     * Calculates the result of a swap.
     *
     * @param swapInput - User defined input for a swap operation, including:
     *   - `amountRaw`: Raw amount for swap (e.g. 1USDC=1000000).
     *   - `tokenIn`: Address of token in.
     *   - `tokenOut`: Address of token out.
     *   - `swapKind`: GivenIn or GivenOut.
     * @param poolState - Pool state that will be used for calculations.
     *   - Note: rates, fees, totalSupply use scaled 18. For detailed information, refer to the `PoolState | BufferState` types.
     * @param hookState - Optional state for any associated hook. Required if pool has a hook enabled.
     *   - Note: Each hook will require its own state data. See `HookState` type for officially supported hook info.
     * @returns The raw result of the swap operation.
     */
    public swap(
        swapInput: SwapInput,
        poolState: PoolState | BufferState,
        hookState?: HookState | unknown,
    ): bigint {
        if (swapInput.amountRaw === 0n) return 0n;

        // buffer is handled separately than a "normal" pool
        if (!('totalSupply' in poolState)) {
            return erc4626BufferWrapOrUnwrap(swapInput, poolState);
        }

        const pool = this.getPool(poolState);
        const hook = this.getHook(poolState.hookType, hookState);

        const inputIndex = poolState.tokens.findIndex((t) =>
            isSameAddress(swapInput.tokenIn, t),
        );
        if (inputIndex === -1) throw Error('Input token not found on pool');

        const outputIndex = poolState.tokens.findIndex((t) =>
            isSameAddress(swapInput.tokenOut, t),
        );
        if (outputIndex === -1) throw Error('Output token not found on pool');

        const amountGivenScaled18 = this._computeAmountGivenScaled18(
            swapInput.amountRaw,
            swapInput.swapKind,
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
                    ...swapInput,
                    hookState,
                },
            );
            if (!success) throw new Error('BeforeSwapHookFailed');
            hookAdjustedBalancesScaled18.forEach(
                (a, i) => (updatedBalancesLiveScaled18[i] = a),
            );
        }

        const swapParams: SwapParams = {
            swapKind: swapInput.swapKind,
            amountGivenScaled18,
            balancesLiveScaled18: updatedBalancesLiveScaled18,
            indexIn: inputIndex,
            indexOut: outputIndex,
        };

        let swapFee = poolState.swapFee;
        if (hook.shouldCallComputeDynamicSwapFee) {
            const { success, dynamicSwapFee } = hook.onComputeDynamicSwapFee(
                swapParams,
                poolState.poolAddress,
                poolState.swapFee,
                hookState,
            );
            if (success) swapFee = dynamicSwapFee;
        }

        // _swap()

        let totalSwapFeeAmountScaled18 = 0n;
        if (swapParams.swapKind === SwapKind.GivenIn) {
            // Round up to avoid losses during precision loss.
            totalSwapFeeAmountScaled18 = MathSol.mulUpFixed(
                swapParams.amountGivenScaled18,
                swapFee,
            );
            swapParams.amountGivenScaled18 -= totalSwapFeeAmountScaled18;
        }

        this._ensureValidSwapAmount(swapParams.amountGivenScaled18);

        let amountCalculatedScaled18 = pool.onSwap(swapParams);

        this._ensureValidSwapAmount(amountCalculatedScaled18);

        let amountCalculatedRaw = 0n;
        if (swapInput.swapKind === SwapKind.GivenIn) {
            // For `ExactIn` the amount calculated is leaving the Vault, so we round down.
            amountCalculatedRaw = toRawUndoRateRoundDown(
                amountCalculatedScaled18,
                poolState.scalingFactors[outputIndex],
                // If the swap is ExactIn, the amountCalculated is the amount of tokenOut. So, we want to use the rate
                // rounded up to calculate the amountCalculatedRaw, because scale down (undo rate) is a division, the
                // larger the rate, the smaller the amountCalculatedRaw. So, any rounding imprecision will stay in the
                // Vault and not be drained by the user.
                this._computeRateRoundUp(poolState.tokenRates[outputIndex]),
            );
        } else {
            // To ensure symmetry with EXACT_IN, the swap fee used by ExactOut is
            // `amountCalculated * fee% / (100% - fee%)`. Add it to the calculated amountIn. Round up to avoid losses
            // during precision loss.
            totalSwapFeeAmountScaled18 = MathSol.mulDivUpFixed(
                amountCalculatedScaled18,
                swapFee,
                MathSol.complementFixed(swapFee),
            );

            amountCalculatedScaled18 += totalSwapFeeAmountScaled18;

            // For `ExactOut` the amount calculated is entering the Vault, so we round up.
            amountCalculatedRaw = toRawUndoRateRoundUp(
                amountCalculatedScaled18,
                poolState.scalingFactors[inputIndex],
                poolState.tokenRates[inputIndex],
            );
        }

        const aggregateSwapFeeAmountScaled18 =
            this._computeAndChargeAggregateSwapFees(
                totalSwapFeeAmountScaled18,
                poolState.aggregateSwapFee,
                poolState.scalingFactors,
                poolState.tokenRates,
                inputIndex,
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
            swapInput.swapKind === SwapKind.GivenIn
                ? [
                      amountGivenScaled18 - aggregateSwapFeeAmountScaled18,
                      amountCalculatedScaled18,
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
                    kind: swapInput.swapKind,
                    tokenIn: swapInput.tokenIn,
                    tokenOut: swapInput.tokenOut,
                    amountInScaled18:
                        swapInput.swapKind === SwapKind.GivenIn
                            ? amountGivenScaled18
                            : amountCalculatedScaled18,
                    amountOutScaled18:
                        swapInput.swapKind === SwapKind.GivenIn
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

    /**
     * Calculates the amount of BPT for a given add liquidity operation.
     *
     * @param addLiquidityInput - User defined input for an addLiquidity operation.
     *   - For detailed information refer to the `AddLiquidityInput` type.
     * @param poolState - Pool state that will be used for calculations.
     *   - Note: rates, fees, totalSupply use scaled 18. For detailed information, refer to the `PoolState` type.
     * @param hookState - Optional state for any associated hook. Required if pool has a hook enabled.
     *   - Note: Each hook will require its own state data. See `HookState` type for officially supported hook info.
     * @returns {Object} An object containing the raw input amounts and the calculated raw BPT output amount.
     * @returns {bigint[]} returns.amountsInRaw - An array of raw input amounts in.
     * @returns {bigint} returns.bptAmountOutRaw - The calculated raw BPT output amount.
     */
    public addLiquidity(
        addLiquidityInput: AddLiquidityInput,
        poolState: PoolState,
        hookState?: HookState | unknown,
    ): { amountsInRaw: bigint[]; bptAmountOutRaw: bigint } {
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
                addLiquidityInput.maxAmountsInRaw,
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
                    addLiquidityInput.kind,
                    addLiquidityInput.maxAmountsInRaw,
                    addLiquidityInput.minBptAmountOutRaw,
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

        if (addLiquidityInput.kind === AddKind.UNBALANCED) {
            this._requireUnbalancedLiquidityEnabled(poolState);
            amountsInScaled18 = maxAmountsInScaled18;
            const computed = computeAddLiquidityUnbalanced(
                updatedBalancesLiveScaled18,
                maxAmountsInScaled18,
                poolState.totalSupply,
                poolState.swapFee,
                pool.getMaximumInvariantRatio(),
                (balancesLiveScaled18, rounding) =>
                    pool.computeInvariant(balancesLiveScaled18, rounding),
            );
            bptAmountOut = computed.bptAmountOut;
            swapFeeAmountsScaled18 = computed.swapFeeAmounts;
        } else if (addLiquidityInput.kind === AddKind.SINGLE_TOKEN_EXACT_OUT) {
            this._requireUnbalancedLiquidityEnabled(poolState);
            const tokenIndex = this._getSingleInputIndex(maxAmountsInScaled18);
            amountsInScaled18 = maxAmountsInScaled18;
            bptAmountOut = addLiquidityInput.minBptAmountOutRaw;
            const computed = computeAddLiquiditySingleTokenExactOut(
                updatedBalancesLiveScaled18,
                tokenIndex,
                bptAmountOut,
                poolState.totalSupply,
                poolState.swapFee,
                pool.getMaximumInvariantRatio(),
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
            amountsInRaw[i] = toRawUndoRateRoundUp(
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
                    poolState.scalingFactors,
                    poolState.tokenRates,
                    i,
                );

            updatedBalancesLiveScaled18[i] =
                updatedBalancesLiveScaled18[i] +
                amountsInScaled18[i] -
                aggregateSwapFeeAmountScaled18;
        }

        if (hook.shouldCallAfterAddLiquidity) {
            const { success, hookAdjustedAmountsInRaw } =
                hook.onAfterAddLiquidity(
                    addLiquidityInput.kind,
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
            amountsInRaw: amountsInRaw,
            bptAmountOutRaw: bptAmountOut,
        };
    }

    /**
     * Calculates the token amounts out for a given remove liquidity operation.
     *
     * @param removeLiquidityInput - User defined input for a removeLiquidity operation.
     *   - For detailed information refer to the `RemoveLiquidityInput` type.
     *   - Note: `minAmountsOutRaw` must always contain an amount for all tokens, e.g. for single token remove other tokens must have 0n.
     * @param poolState - Pool state that will be used for calculations.
     *   - Note: rates, fees, totalSupply use scaled 18. For detailed information, refer to the `PoolState` type.
     * @param hookState - Optional state for any associated hook. Required if pool has a hook enabled.
     *   - Note: Each hook will require its own state data. See `HookState` type for officially supported hook info.
     * @returns {Object} An object containing the calculated raw output amounts and the BPT input amount.
     * @returns {bigint[]} returns.amountsOutRaw - An array of calculated raw output amounts.
     * @returns {bigint} returns.bptAmountInRaw - The raw BPT input amount.
     */
    public removeLiquidity(
        removeLiquidityInput: RemoveLiquidityInput,
        poolState: PoolState,
        hookState?: HookState | unknown,
    ): { amountsOutRaw: bigint[]; bptAmountInRaw: bigint } {
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
            removeLiquidityInput.minAmountsOutRaw,
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
                    removeLiquidityInput.kind,
                    removeLiquidityInput.maxBptAmountInRaw,
                    removeLiquidityInput.minAmountsOutRaw,
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

        if (removeLiquidityInput.kind === RemoveKind.PROPORTIONAL) {
            bptAmountIn = removeLiquidityInput.maxBptAmountInRaw;
            swapFeeAmountsScaled18 = new Array(poolState.tokens.length).fill(
                0n,
            );
            amountsOutScaled18 = computeProportionalAmountsOut(
                updatedBalancesLiveScaled18,
                poolState.totalSupply,
                removeLiquidityInput.maxBptAmountInRaw,
            );
        } else if (
            removeLiquidityInput.kind === RemoveKind.SINGLE_TOKEN_EXACT_IN
        ) {
            this._requireUnbalancedLiquidityEnabled(poolState);
            bptAmountIn = removeLiquidityInput.maxBptAmountInRaw;
            amountsOutScaled18 = minAmountsOutScaled18;
            tokenOutIndex = this._getSingleInputIndex(
                removeLiquidityInput.minAmountsOutRaw,
            );
            const computed = computeRemoveLiquiditySingleTokenExactIn(
                updatedBalancesLiveScaled18,
                tokenOutIndex,
                removeLiquidityInput.maxBptAmountInRaw,
                poolState.totalSupply,
                poolState.swapFee,
                pool.getMinimumInvariantRatio(),
                (balancesLiveScaled18, tokenIndex, invariantRatio) =>
                    pool.computeBalance(
                        balancesLiveScaled18,
                        tokenIndex,
                        invariantRatio,
                    ),
            );
            amountsOutScaled18[tokenOutIndex] = computed.amountOutWithFee;
            swapFeeAmountsScaled18 = computed.swapFeeAmounts;
        } else if (
            removeLiquidityInput.kind === RemoveKind.SINGLE_TOKEN_EXACT_OUT
        ) {
            this._requireUnbalancedLiquidityEnabled(poolState);
            amountsOutScaled18 = minAmountsOutScaled18;
            tokenOutIndex = this._getSingleInputIndex(
                removeLiquidityInput.minAmountsOutRaw,
            );
            const computed = computeRemoveLiquiditySingleTokenExactOut(
                updatedBalancesLiveScaled18,
                tokenOutIndex,
                amountsOutScaled18[tokenOutIndex],
                poolState.totalSupply,
                poolState.swapFee,
                pool.getMinimumInvariantRatio(),
                (balancesLiveScaled18, rounding) =>
                    pool.computeInvariant(balancesLiveScaled18, rounding),
            );
            bptAmountIn = computed.bptAmountIn;
            swapFeeAmountsScaled18 = computed.swapFeeAmounts;
        } else throw new Error('Unsupported RemoveLiquidity Kind');

        const amountsOutRaw = new Array(poolState.tokens.length);

        for (let i = 0; i < poolState.tokens.length; ++i) {
            // amountsOut are amounts exiting the Pool, so we round down.
            amountsOutRaw[i] = toRawUndoRateRoundDown(
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
                    poolState.scalingFactors,
                    poolState.tokenRates,
                    i,
                );

            updatedBalancesLiveScaled18[i] =
                updatedBalancesLiveScaled18[i] -
                (amountsOutScaled18[i] + aggregateSwapFeeAmountScaled18);
        }

        // AmountsOut can be changed by onAfterRemoveLiquidity if the hook charges fees or gives discounts
        if (hook.shouldCallAfterRemoveLiquidity) {
            const { success, hookAdjustedAmountsOutRaw } =
                hook.onAfterRemoveLiquidity(
                    removeLiquidityInput.kind,
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
            amountsOutRaw: amountsOutRaw,
            bptAmountInRaw: bptAmountIn,
        };
    }

    private _computeAndChargeAggregateSwapFees(
        swapFeeAmountScaled18: bigint,
        aggregateSwapFeePercentage: bigint,
        decimalScalingFactors: bigint[],
        tokenRates: bigint[],
        index: number,
    ): bigint {
        if (swapFeeAmountScaled18 > 0 && aggregateSwapFeePercentage > 0) {
            // The total swap fee does not go into the pool; amountIn does, and the raw fee at this point does not
            // modify it. Given that all of the fee may belong to the pool creator (i.e. outside pool balances),
            // we round down to protect the invariant.
            const totalSwapFeeAmountRaw = toRawUndoRateRoundDown(
                swapFeeAmountScaled18,
                decimalScalingFactors[index],
                tokenRates[index],
            );

            return MathSol.mulDownFixed(
                totalSwapFeeAmountRaw,
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
            toScaled18ApplyRateRoundDown(a, scalingFactors[i], tokenRates[i]),
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
            toScaled18ApplyRateRoundUp(a, scalingFactors[i], tokenRates[i]),
        );
    }

    private _computeAmountGivenScaled18(
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
                ? toScaled18ApplyRateRoundDown(
                      amountGivenRaw,
                      scalingFactors[indexIn],
                      tokenRates[indexIn],
                  )
                : toScaled18ApplyRateRoundUp(
                      amountGivenRaw,
                      scalingFactors[indexOut],
                      this._computeRateRoundUp(tokenRates[indexOut]),
                  );
        return amountGivenScaled18;
    }

    /**
     * @notice Rounds up a rate informed by a rate provider.
     * @dev Rates calculated by an external rate provider have rounding errors. Intuitively, a rate provider
     * rounds the rate down so the pool math is executed with conservative amounts. However, when upscaling or
     * downscaling the amount out, the rate should be rounded up to make sure the amounts scaled are conservative.
     */
    private _computeRateRoundUp(rate: bigint): bigint {
        // If rate is divisible by FixedPoint.ONE, roundedRate and rate will be equal. It means that rate has 18 zeros,
        // so there's no rounding issue and the rate should not be rounded up.

        const roundedRate = (rate / WAD) * WAD;

        return roundedRate == rate ? rate : rate + 1n;
    }

    // Minimum token value in or out (applied to scaled18 values), enforced as a security measure to block potential
    // exploitation of rounding errors. This is called in the swap context, so zero is not a valid amount.
    private _ensureValidSwapAmount(tradeAmount: bigint): boolean {
        if (tradeAmount < _MINIMUM_TRADE_AMOUNT) {
            throw new Error(`TradeAmountTooSmall ${tradeAmount}`);
        }
        return true;
    }

    private _requireUnbalancedLiquidityEnabled(poolState: PoolState): void {
        if (!poolState.supportsUnbalancedLiquidity) {
            throw new Error('DoesNotSupportUnbalancedLiquidity');
        }
    }
}

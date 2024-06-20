import { MathSol } from "../utils/math";
import {
	computeAddLiquiditySingleTokenExactOut,
	computeAddLiquidityUnbalanced,
	computeProportionalAmountsOut,
	computeRemoveLiquiditySingleTokenExactIn,
	computeRemoveLiquiditySingleTokenExactOut,
} from "./basePoolMath";
import { Weighted, type WeightedState } from "../weighted";
import { Stable, type StableState } from "../stable";

export interface PoolBase {
	onSwap(swapParams: SwapParams): bigint;
	computeInvariant(balancesLiveScaled18: bigint[]): bigint;
	computeBalance(
		balancesLiveScaled18: bigint[],
		tokenInIndex: number,
		invariantRatio: bigint,
	): bigint;
}

export type poolConfig = {
	customPoolTypes: Record<string, PoolBase>;
};

export type PoolState = WeightedState | StableState;

export enum SwapKind {
	GivenIn = 0,
	GivenOut = 1,
}

export type SwapInput = {
	amountRaw: bigint;
	tokenIn: string;
	tokenOut: string;
	swapKind: SwapKind;
};

export type SwapParams = {
	swapKind: SwapKind;
	amountGivenScaled18: bigint;
	balancesScaled18: bigint[];
	indexIn: number;
	indexOut: number;
};

export enum AddKind {
	UNBALANCED = 0,
	SINGLE_TOKEN_EXACT_OUT = 1,
}

export type AddLiquidityInput = {
	pool: string;
	maxAmountsIn: bigint[];
	minBptAmountOut: bigint;
	kind: AddKind;
};

export enum RemoveKind {
	PROPORTIONAL = 0,
	SINGLE_TOKEN_EXACT_IN = 1,
	SINGLE_TOKEN_EXACT_OUT = 2,
}

export type RemoveLiquidityInput = {
	pool: string;
	minAmountsOut: bigint[];
	maxBptAmountIn: bigint;
	kind: RemoveKind;
};

function isSameAddress(addressOne: string, addressTwo: string) {
	return addressOne.toLowerCase() === addressTwo.toLowerCase();
}

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
type PoolClassConstructor = new (...args: any[]) => PoolBase;
type PoolClasses = Readonly<Record<string, PoolClassConstructor>>;

export class Vault {
	private readonly poolClasses: PoolClasses = {} as const;

	constructor(customPoolClasses?: PoolClasses) {
		this.poolClasses = {
			Weighted: Weighted,
			Stable: Stable,
			// custom add liquidity types take precedence over base types
			...customPoolClasses,
		};
	}

	public getPool(poolState: PoolState): PoolBase {
		const poolClass = this.poolClasses[poolState.poolType];
		if (!poolClass)
			throw new Error(`Unsupported Pool Type: ${poolState.poolType}`);
		return new poolClass(poolState);
	}

	public swap(input: SwapInput, poolState: PoolState): bigint {
		const pool = this.getPool(poolState);

		const inputIndex = poolState.tokens.findIndex((t) =>
			isSameAddress(input.tokenIn, t),
		);
		if (inputIndex === -1) throw Error("Input token not found on pool");

		const outputIndex = poolState.tokens.findIndex((t) =>
			isSameAddress(input.tokenOut, t),
		);
		if (outputIndex === -1) throw Error("Output token not found on pool");

		const amountGivenScaled18 = this._updateAmountGivenInVars(
			input.amountRaw,
			input.swapKind,
			inputIndex,
			outputIndex,
			poolState.scalingFactors,
			poolState.tokenRates,
		);

		// hook: shouldCallBeforeSwap (TODO - need to handle balance changes, etc see code)

		// hook: dynamicSwapFee

		// _swap()
		const swapParams: SwapParams = {
			swapKind: input.swapKind,
			amountGivenScaled18,
			balancesScaled18: poolState.balances,
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
            swapFeeAmountScaled18 = MathSol.mulUpFixed(amountCalculatedScaled18, poolState.swapFee);
        }

		let amountCalculated = 0n;
		if (input.swapKind === SwapKind.GivenIn) {
			amountCalculatedScaled18 -= swapFeeAmountScaled18;

            // For `ExactIn` the amount calculated is leaving the Vault, so we round down.
            amountCalculated = this._toRawUndoRateRoundDown(
				amountCalculatedScaled18,
				poolState.scalingFactors[outputIndex],
				poolState.tokenRates[outputIndex],
			);
		} else {
			amountCalculatedScaled18 += swapFeeAmountScaled18;

			// For `ExactOut` the amount calculated is entering the Vault, so we round up.
			amountCalculated = this._toRawUndoRateRoundUp(
				amountCalculatedScaled18,
				poolState.scalingFactors[inputIndex],
				poolState.tokenRates[inputIndex],
			);
		}

		// TODO - Depending on hook implementation we may need to alter the logic for handling amounts, etc
		// hook: after swap

		return amountCalculated;
	}

	public addLiquidity(
		input: AddLiquidityInput,
		poolState: PoolState,
	): { amountsIn: bigint[]; bptAmountOut: bigint } {
		const pool = this.getPool(poolState);

		// Amounts are entering pool math, so round down.
		// Introducing amountsInScaled18 here and passing it through to _addLiquidity is not ideal,
		// but it avoids the even worse options of mutating amountsIn inside AddLiquidityParams,
		// or cluttering the AddLiquidityParams interface by adding amountsInScaled18.
		const maxAmountsInScaled18 = this._copyToScaled18ApplyRateRoundDownArray(
			input.maxAmountsIn,
			poolState.scalingFactors,
			poolState.tokenRates,
		);

		// hook: shouldCallBeforeAddLiquidity (TODO - need to handle balance changes, etc see code)

		let amountsInScaled18: bigint[];
		let bptAmountOut: bigint;
		let swapFeeAmounts: bigint[];
		if (input.kind === AddKind.UNBALANCED) {
			amountsInScaled18 = maxAmountsInScaled18;
			const computed = computeAddLiquidityUnbalanced(
				poolState.balances, // should be liveScaled18
				maxAmountsInScaled18,
				poolState.totalSupply,
				poolState.swapFee,
				(balancesLiveScaled18) => pool.computeInvariant(balancesLiveScaled18),
			);
			bptAmountOut = computed.bptAmountOut;
			swapFeeAmounts = computed.swapFeeAmounts;
		} else if (input.kind === AddKind.SINGLE_TOKEN_EXACT_OUT) {
			const tokenIndex = this._getSingleInputIndex(maxAmountsInScaled18);
			amountsInScaled18 = maxAmountsInScaled18;
			bptAmountOut = input.minBptAmountOut;
			const computed = computeAddLiquiditySingleTokenExactOut(
				poolState.balances, // should be liveScaled18
				tokenIndex,
				bptAmountOut,
				poolState.totalSupply,
				poolState.swapFee,
				(balancesLiveScaled18, tokenIndex, invariantRatio) =>
					pool.computeBalance(balancesLiveScaled18, tokenIndex, invariantRatio),
			);
			amountsInScaled18[tokenIndex] = computed.amountInWithFee;
			swapFeeAmounts = computed.swapFeeAmounts;
		} else throw new Error("Unsupported AddLiquidity Kind");

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

		return {
			amountsIn: amountsInRaw,
			bptAmountOut: bptAmountOut,
		};
	}

	public removeLiquidity(
		input: RemoveLiquidityInput,
		poolState: PoolState,
	): { amountsOut: bigint[]; bptAmountIn: bigint } {
		const pool = this.getPool(poolState);

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

		let tokenOutIndex: number;
		let swapFeeAmountsScaled18: bigint[];
		let bptAmountIn: bigint;
		let amountsOutScaled18: bigint[];

		if (input.kind === RemoveKind.PROPORTIONAL) {
			bptAmountIn = input.maxBptAmountIn;
			swapFeeAmountsScaled18 = poolState.balances;
			amountsOutScaled18 = computeProportionalAmountsOut(
				poolState.balances,
				poolState.totalSupply,
				input.maxBptAmountIn,
			);
		} else if (input.kind === RemoveKind.SINGLE_TOKEN_EXACT_IN) {
			bptAmountIn = input.maxBptAmountIn;
			amountsOutScaled18 = minAmountsOutScaled18;
			tokenOutIndex = this._getSingleInputIndex(input.minAmountsOut);
			const computed = computeRemoveLiquiditySingleTokenExactIn(
				poolState.balances,
				tokenOutIndex,
				input.maxBptAmountIn,
				poolState.totalSupply,
				poolState.swapFee,
				(balancesLiveScaled18, tokenIndex, invariantRatio) =>
					pool.computeBalance(balancesLiveScaled18, tokenIndex, invariantRatio),
			);
			swapFeeAmountsScaled18 = computed.swapFeeAmounts;
			amountsOutScaled18[tokenOutIndex] = computed.amountOutWithFee;
		} else if (input.kind === RemoveKind.SINGLE_TOKEN_EXACT_OUT) {
			amountsOutScaled18 = minAmountsOutScaled18;
			tokenOutIndex = this._getSingleInputIndex(input.minAmountsOut);
			const computed = computeRemoveLiquiditySingleTokenExactOut(
				poolState.balances,
				tokenOutIndex,
				amountsOutScaled18[tokenOutIndex],
				poolState.totalSupply,
				poolState.swapFee,
				(balancesLiveScaled18) => pool.computeInvariant(balancesLiveScaled18),
			);
			bptAmountIn = computed.bptAmountIn;
			swapFeeAmountsScaled18 = computed.swapFeeAmounts;
		} else throw new Error("Unsupported RemoveLiquidity Kind");

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
					throw new Error("Multiple non-zero inputs for single token add");
				}
				inputIndex = i;
			}
		}

		if (inputIndex >= length) {
			throw new Error("All zero inputs for single token add");
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
			this._toScaled18ApplyRateRoundDown(a, scalingFactors[i], tokenRates[i]),
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
			this._toScaled18ApplyRateRoundUp(a, scalingFactors[i], tokenRates[i]),
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

import type { WeightedState } from "@/weighted/data";
import { WeightedPool } from "../weighted/weightedPool";
import { MathSol } from "../utils/math";

export interface PoolBase {
	onSwap(
		swapKind: SwapKind,
		balanceIn: bigint,
		weightIn: bigint,
		balanceOut: bigint,
		weightOut: bigint,
		amount: bigint,
	): bigint;
}

export type poolConfig = {
	customPoolTypes: Record<string, PoolBase>;
};

export type PoolState = { poolType: string } & WeightedState;

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

function isSameAddress(addressOne: string, addressTwo: string) {
	return addressOne.toLowerCase() === addressTwo.toLowerCase();
}

export class Vault {
	private readonly poolTypes: Record<string, PoolBase> = {};

	constructor(config?: poolConfig) {
		const { customPoolTypes: customAddLiquidityTypes } = config || {};
		this.poolTypes = {
			Weighted: new WeightedPool(),
			// custom add liquidity types take precedence over base types
			...customAddLiquidityTypes,
		};
	}

	public getPool(poolType: string): PoolBase {
		if (!this.poolTypes[poolType]) {
			throw new Error(`Unsupported pool type ${poolType}`);
		}
		return this.poolTypes[poolType];
	}

	public swap(input: SwapInput, poolState: PoolState): bigint {
		const pool = this.getPool(poolState.poolType);

		const inputIndex = poolState.tokens.findIndex((t) =>
			isSameAddress(input.tokenIn, t),
		);
		if (inputIndex === -1) throw Error("Input token not found on pool");

		const outputIndex = poolState.tokens.findIndex((t) =>
			isSameAddress(input.tokenOut, t),
		);
		if (outputIndex === -1) throw Error("Output token not found on pool");

		let amountGivenScaled18 = this._updateAmountGivenInVars(
			input.amountRaw,
			input.swapKind,
			inputIndex,
			outputIndex,
			poolState.scalingFactors,
			poolState.tokenRates,
		);
		if (poolState.swapFee > 0 && input.swapKind === SwapKind.GivenOut) {
			// Round up to avoid losses during precision loss.
			const swapFeeAmountScaled18 =
				MathSol.divUpFixed(
					amountGivenScaled18,
					MathSol.complementFixed(poolState.swapFee),
				) - amountGivenScaled18;
			amountGivenScaled18 += swapFeeAmountScaled18;
		}

		// hook: shouldCallBeforeSwap (TODO - need to handle balance changes, etc see code)

		// hook: dynamicSwapFee

		let amountCalculatedScaled18 = pool.onSwap(
			input.swapKind,
			poolState.balances[inputIndex],
			poolState.weights[inputIndex],
			poolState.balances[outputIndex],
			poolState.weights[outputIndex],
			amountGivenScaled18,
		);

		let amountCalculated = 0n;
		if (input.swapKind === SwapKind.GivenIn) {
			if (poolState.swapFee > 0) {
				// Swap fee is a percentage of the amountCalculated for the EXACT_IN swap
				// Round up to avoid losses during precision loss.
				const swapFeeAmountScaled18 = MathSol.mulUpFixed(
					amountCalculatedScaled18,
					poolState.swapFee,
				);
				// Should subtract the fee from the amountCalculated for EXACT_IN swap
				amountCalculatedScaled18 -= swapFeeAmountScaled18;
			}
			// For `ExactIn` the amount calculated is leaving the Vault, so we round down.
			amountCalculated = this._toRawUndoRateRoundDown(
				amountCalculatedScaled18,
				poolState.scalingFactors[outputIndex],
				poolState.tokenRates[outputIndex],
			);
			// (amountIn, amountOut) = (params.amountGivenRaw, amountCalculated);
		} else {
			// Round up when entering the Vault on `ExactOut`.
			amountCalculated = this._toRawUndoRateRoundUp(
				amountCalculatedScaled18,
				poolState.scalingFactors[inputIndex],
				poolState.tokenRates[inputIndex],
			);

			// (amountIn, amountOut) = (amountCalculated, params.amountGivenRaw);
		}

		// TODO - Depending on hook implementation we may need to alter the logic for handling amounts, etc
		// hook: after swap

		return amountCalculated;
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

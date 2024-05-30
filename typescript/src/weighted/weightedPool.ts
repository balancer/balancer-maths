import { type PoolBase, SwapKind, type PoolState } from "../vault/vault";
import {
	_computeOutGivenExactIn,
	_computeInGivenExactOut,
	_computeInvariant,
	_computeBalanceOutGivenInvariant,
} from "./weightedMath";

export class Weighted implements PoolBase {
	public normalizedWeights: bigint[];

	constructor(poolState: {
		weights: bigint[];
	}) {
		this.normalizedWeights = poolState.weights;
	}

	onSwap(
		swapKind: SwapKind,
		balanceIn: bigint,
		weightIn: bigint,
		balanceOut: bigint,
		weightOut: bigint,
		amount: bigint,
	): bigint {
		if (swapKind === SwapKind.GivenIn) {
			return _computeOutGivenExactIn(
				balanceIn,
				weightIn,
				balanceOut,
				weightOut,
				amount,
			);
		}
		return _computeInGivenExactOut(
			balanceIn,
			weightIn,
			balanceOut,
			weightOut,
			amount,
		);
	}
	computeInvariant(balancesLiveScaled18: bigint[]): bigint {
		return _computeInvariant(this.normalizedWeights, balancesLiveScaled18);
	}
	computeBalance(
		balancesLiveScaled18: bigint[],
		tokenInIndex: number,
		invariantRatio: bigint,
	): bigint {
		return _computeBalanceOutGivenInvariant(
			balancesLiveScaled18[tokenInIndex],
			this.normalizedWeights[tokenInIndex],
			invariantRatio,
		);
	}
}

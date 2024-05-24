import { type PoolBase, SwapKind } from "../vault/vault";
import {
	_computeOutGivenExactIn,
	_computeInGivenExactOut,
} from "./weightedMath";

export class WeightedPool implements PoolBase {
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
}

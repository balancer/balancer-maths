import {
	type PublicClient,
	createPublicClient,
	http,
	type Address,
	parseAbi,
	type Chain,
} from "viem";
import { CHAINS, VAULT_V3 } from "@balancer/sdk";
import type {
	WeightedImmutable,
	WeightedMutable,
} from "../../typescript/src/weighted/data";
import { MathSol } from "../../typescript/src/utils/math";
import { vaultV3Abi } from "./abi/vaultV3";

type TransformBigintToString<T> = {
	[K in keyof T]: T[K] extends bigint
		? string
		: T[K] extends bigint[]
			? string[]
			: T[K];
};

export class WeightedPool {
	client: PublicClient;
	vault: Address;

	constructor(
		public rpcUrl: string,
		public chainId: number,
	) {
		this.client = createPublicClient({
			transport: http(this.rpcUrl),
			chain: CHAINS[this.chainId] as Chain,
		});
		this.vault = VAULT_V3[this.chainId];
	}

	async fetchImmutableData(
		address: Address,
	): Promise<TransformBigintToString<WeightedImmutable>> {
		const poolTokensCall = {
			address: this.vault,
			abi: vaultV3Abi,
			functionName: "getPoolTokenInfo",
			args: [address],
		} as const;
		const tokenWeightsCall = {
			address,
			abi: parseAbi([
				"function getNormalizedWeights() external view returns (uint256[] memory)",
			]),
			functionName: "getNormalizedWeights",
		} as const;

		const multicallResult = await this.client.multicall({
			contracts: [poolTokensCall, tokenWeightsCall],
			allowFailure: false,
		});
		return {
			tokens: multicallResult[0][0].map((t) => t.token.toString()),
			scalingFactors: multicallResult[0][2].map((sf) => sf.toString()),
			weights: multicallResult[1].map((w) => w.toString()),
		};
	}

	async fetchMutableData(
		address: Address,
	): Promise<TransformBigintToString<WeightedMutable>> {
		const poolTokensCall = {
			address: this.vault,
			abi: vaultV3Abi,
			functionName: "getPoolTokenInfo",
			args: [address],
		} as const;
		const staticSwapFeeCall = {
			address: this.vault,
			abi: vaultV3Abi,
			functionName: "getStaticSwapFeePercentage",
			args: [address],
		} as const;
		const totalSupplyCall = {
			address: this.vault,
			abi: parseAbi([
				"function totalSupply(address token) external view returns (uint256)",
			]),
			functionName: "totalSupply",
			args: [address],
		} as const;

		const multicallResult = await this.client.multicall({
			contracts: [staticSwapFeeCall, poolTokensCall, totalSupplyCall],
			allowFailure: false,
		});
		// Note - this is a temp fix and does not currently take into account yield fees. In future mono-repo there should be a call to fetch live balances that will not require scaling and will have fees taken into account.
		const rawBalances = multicallResult[1][1];
		const scalingFactors = multicallResult[1][2];
		const liveBalances = rawBalances.map((rb, i) =>
			MathSol.mulDownFixed(rb, scalingFactors[i]),
		);
		return {
			swapFee: multicallResult[0].toString(),
			balances: liveBalances.map((b) => b.toString()),
			tokenRates: scalingFactors.map((sf) => sf.toString()), // TODO - Should be replaced with actual tokenRates when a view is available
			totalSupply: multicallResult[2].toString()
		};
	}
}

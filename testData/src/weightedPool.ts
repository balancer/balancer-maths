import {
	type PublicClient,
	createPublicClient,
	http,
	type Address,
	parseAbi,
	type Chain,
} from "viem";
import {
	CHAINS,
	VAULT_V3,
	vaultExtensionV3Abi,
} from "@balancer/sdk";
import type {
	WeightedImmutable,
	WeightedMutable,
} from "../../typescript/src/weighted/data";

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
			abi: vaultExtensionV3Abi,
			functionName: "getPoolTokenInfo",
			args: [address],
		} as const;
		const tokenRatesCall = {
			address: this.vault,
			abi: vaultExtensionV3Abi,
			functionName: "getPoolTokenRates",
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
			contracts: [poolTokensCall, tokenRatesCall, tokenWeightsCall],
			allowFailure: false,
		});
		return {
			tokens: multicallResult[0][0].map((token) => token),
			scalingFactors: multicallResult[1][0].map((sf) => sf.toString()),
			weights: multicallResult[2].map((w) => w.toString()),
		};
	}

	async fetchMutableData(
		address: Address,
	): Promise<TransformBigintToString<WeightedMutable>> {
		const staticSwapFeeCall = {
			address: this.vault,
			abi: vaultExtensionV3Abi,
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
		const liveBalancesCall = {
			address: this.vault,
			abi: vaultExtensionV3Abi,
			functionName: "getCurrentLiveBalances",
			args: [address],
		} as const;
		const tokenRatesCall = {
			address: this.vault,
			abi: vaultExtensionV3Abi,
			functionName: "getPoolTokenRates",
			args: [address],
		} as const;

		const multicallResult = await this.client.multicall({
			contracts: [
				staticSwapFeeCall,
				totalSupplyCall,
				liveBalancesCall,
				tokenRatesCall
			],
			allowFailure: false,
		});
		return {
			swapFee: multicallResult[0].toString(),
			totalSupply: multicallResult[1].toString(),
			balancesLiveScaled18: multicallResult[2].map((b) => b.toString()),
			tokenRates: multicallResult[3][1].map((b) => b.toString()),
		};
	}
}

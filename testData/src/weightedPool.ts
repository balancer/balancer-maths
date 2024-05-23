import {
	type PublicClient,
	createPublicClient,
	http,
	type Address,
	parseAbi,
} from "viem";
import { CHAINS, VAULT_V3 } from "@balancer/sdk";
import type {
	WeightedImmutable,
	WeightedMutable,
} from "../../typescript/src/weighted/data";

export class WeightedPool {
	client: PublicClient;
	vault: Address;

	constructor(
		public rpcUrl: string,
		public chainId: number,
	) {
		this.client = createPublicClient({
			transport: http(this.rpcUrl),
			chain: CHAINS[this.chainId],
		});
		this.vault = VAULT_V3[this.chainId];
	}

	mulDown(a: bigint, b: bigint): bigint {
		const product = a * b;
		return product / BigInt(1e18);
	}

	async fetchImmutableData(address: Address): Promise<WeightedImmutable> {
		const poolTokensCall = {
			address,
			abi: parseAbi([
				"function getPoolTokens() external view returns (address[] memory)",
			]),
			functionName: "getPoolTokens",
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
			tokens: multicallResult[0].map((t) => t.toString()),
			weights: multicallResult[1].map((w) => w.toString()),
		};
	}

	async fetchMutableData(address: Address): Promise<WeightedMutable> {
		const poolTokensCall = {
			address: this.vault,
			abi: parseAbi([
				"function getPoolTokenInfo(address pool) external view returns (address[] memory, uint256[] memory, uint256[] memory, uint256[] memory, address[] memory)",
			]),
			functionName: "getPoolTokenInfo",
			args: [address],
		} as const;
		const staticSwapFeeCall = {
			address: this.vault,
			abi: parseAbi([
				"function getStaticSwapFeePercentage(address pool) external view returns (uint256)",
			]),
			functionName: "getStaticSwapFeePercentage",
			args: [address],
		} as const;

		const multicallResult = await this.client.multicall({
			contracts: [staticSwapFeeCall, poolTokensCall],
			allowFailure: false,
		});
		// Note - this is a temp fix and does not currently take into account yield fees. In future mono-repo there should be a call to fetch live balances that will not require scaling and will have fees taken into account.
		const rawBalances = multicallResult[1][2];
		const scalingFactors = multicallResult[1][3];
		const liveBalances = rawBalances.map((rb, i) =>
			this.mulDown(rb, scalingFactors[i]).toString(),
		);
		return {
			swapFee: multicallResult[0].toString(),
			balances: liveBalances,
		};
	}
}

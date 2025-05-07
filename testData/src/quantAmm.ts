import { PublicClient, Address, http, createPublicClient, Chain } from 'viem';
import { quantAmmAbi } from './abi/quantAmm';
import { VAULT_V3 } from '@balancer/sdk';
import { CHAINS } from '@balancer/sdk';
import { vaultExplorerAbi } from './abi/vaultExplorer';

export interface QuantAmmMutableData {
    balancesLiveScaled18: bigint[];
    tokenRates: bigint[];
    totalSupply: bigint;
    firstFourWeightsAndMultipliers: bigint[];
    secondFourWeightsAndMultipliers: bigint[];
    lastUpdateTime: bigint;
    lastInteropTime: bigint;
    currentTimestamp: bigint;
}

export interface QuantAmmImmutableData {
    tokens: string[];
    maxTradeSizeRatio: bigint;
    scalingFactors: bigint[];
    swapFee: bigint;
}

type TransformBigintToString<T> = {
    [K in keyof T]: T[K] extends bigint
        ? string
        : T[K] extends bigint[]
          ? string[]
          : T[K];
};

export class QuantAmmPool {
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
        blockNumber?: bigint,
    ): Promise<TransformBigintToString<QuantAmmImmutableData>> {
        const data = await this.client.readContract({
            address,
            abi: quantAmmAbi,
            functionName: 'getQuantAMMWeightedPoolImmutableData',
            blockNumber,
        });

        const [scalingFactors] = await this.client.readContract({
            address: this.vault,
            abi: vaultExplorerAbi,
            functionName: 'getPoolTokenRates',
            args: [address],
            blockNumber,
        });

        const staticSwapFeePercentage = await this.client.readContract({
            address,
            abi: quantAmmAbi,
            functionName: 'getStaticSwapFeePercentage',
            blockNumber,
        });

        return {
            tokens: data.tokens.map((token: string) => token.toLowerCase()),
            maxTradeSizeRatio: data.maxTradeSizeRatio.toString(),
            scalingFactors: scalingFactors.map((sf) => sf.toString()),
            swapFee: staticSwapFeePercentage.toString(),
        };
    }

    async fetchMutableData(
        address: Address,
        blockNumber?: bigint,
    ): Promise<TransformBigintToString<QuantAmmMutableData>> {
        const data = await this.client.readContract({
            address,
            abi: quantAmmAbi,
            functionName: 'getQuantAMMWeightedPoolDynamicData',
            blockNumber,
        });

        const block = await this.client.getBlock({
            blockNumber,
        });

        return {
            balancesLiveScaled18: data.balancesLiveScaled18.map((b) =>
                b.toString(),
            ),
            tokenRates: data.tokenRates.map((b) => b.toString()),
            totalSupply: data.totalSupply.toString(),
            firstFourWeightsAndMultipliers:
                data.firstFourWeightsAndMultipliers.map((b) => b.toString()),
            secondFourWeightsAndMultipliers:
                data.secondFourWeightsAndMultipliers.map((b) => b.toString()),
            lastUpdateTime: data.lastUpdateTime.toString(),
            lastInteropTime: data.lastInteropTime.toString(),
            currentTimestamp: block.timestamp.toString(),
        };
    }
}

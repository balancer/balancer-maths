import {
    PublicClient,
    createPublicClient,
    http,
    type Address,
    type Chain,
} from 'viem';
import { CHAINS } from '@balancer/sdk';
import { VAULT_V3, vaultExtensionAbi_V3 } from '@balancer/sdk';
import { fixedPriceLBPAbi } from './abi/fixedPriceLBPAbi';
import { TransformBigintToString } from './types';

export type FixedPriceLBPoolImmutableData = {
    tokens: string[];
    scalingFactors: bigint[];
    startTime: bigint;
    endTime: bigint;
    projectTokenIndex: number;
    reserveTokenIndex: number;
    projectTokenRate: bigint;
};

export type FixedPriceLBPoolDynamicData = {
    balancesLiveScaled18: bigint[];
    staticSwapFeePercentage: bigint;
    totalSupply: bigint;
    isPoolInitialized: boolean;
    isPoolPaused: boolean;
    isPoolInRecoveryMode: boolean;
    isSwapEnabled: boolean;
};

export class FixedPriceLBPPool {
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
        blockNumber: bigint,
    ): Promise<TransformBigintToString<FixedPriceLBPoolImmutableData>> {
        const {
            tokens,
            decimalScalingFactors,
            startTime,
            endTime,
            projectTokenIndex,
            reserveTokenIndex,
            projectTokenRate,
        } = await this.client.readContract({
            address,
            abi: fixedPriceLBPAbi,
            functionName: 'getFixedPriceLBPoolImmutableData',
            blockNumber,
        });

        return {
            tokens: [...tokens],
            scalingFactors: decimalScalingFactors.map((sf) => sf.toString()),
            startTime: startTime.toString(),
            endTime: endTime.toString(),
            projectTokenIndex: Number(projectTokenIndex),
            reserveTokenIndex: Number(reserveTokenIndex),
            projectTokenRate: projectTokenRate.toString(),
        };
    }

    async fetchMutableData(
        address: Address,
        blockNumber: bigint,
    ): Promise<
        TransformBigintToString<
            Omit<
                FixedPriceLBPoolDynamicData,
                'staticSwapFeePercentage'
            > & {
                swapFee: string;
                tokenRates: string[];
                currentTimestamp: string;
            }
        >
    > {
        const dynamicDataCall = {
            address,
            abi: fixedPriceLBPAbi,
            functionName: 'getFixedPriceLBPoolDynamicData',
        } as const;

        const tokenRatesCall = {
            address: this.vault,
            abi: vaultExtensionAbi_V3,
            functionName: 'getPoolTokenRates',
            args: [address],
        } as const;

        const multicallResult = await this.client.multicall({
            contracts: [dynamicDataCall, tokenRatesCall],
            allowFailure: false,
            blockNumber,
        });

        const {
            balancesLiveScaled18,
            staticSwapFeePercentage,
            totalSupply,
            isPoolInitialized,
            isPoolPaused,
            isPoolInRecoveryMode,
            isSwapEnabled,
        } = multicallResult[0] as FixedPriceLBPoolDynamicData;

        const tokenRates = multicallResult[1][1] as bigint[];

        const { timestamp } = await this.client.getBlock({ blockNumber });

        return {
            balancesLiveScaled18: balancesLiveScaled18.map((b) => b.toString()),
            swapFee: staticSwapFeePercentage.toString(),
            totalSupply: totalSupply.toString(),
            tokenRates: tokenRates.map((rate) => rate.toString()),
            isPoolInitialized,
            isPoolPaused,
            isPoolInRecoveryMode,
            isSwapEnabled,
            currentTimestamp: timestamp.toString(),
        };
    }
}

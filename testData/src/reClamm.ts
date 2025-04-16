import {
    type PublicClient,
    createPublicClient,
    http,
    type Address,
    type Chain,
} from 'viem';
import { CHAINS, VAULT_V3, vaultExtensionAbi_V3 } from '@balancer/sdk';
import { vaultExplorerAbi } from './abi/vaultExplorer';
import { reclammAbi } from './abi/reClamm';

type ReClammMutable = {
    swapFee: bigint;
    totalSupply: bigint;
    balancesLiveScaled18: bigint[];
    tokenRates: bigint[];
    aggregateSwapFee: bigint;
    // ReClamm
    lastTimestamp: bigint;
    lastVirtualBalances: bigint[];
    priceShiftDailyRateInSeconds: bigint;
    centerednessMargin: bigint;
    currentFourthRootPriceRatio: bigint;
    startFourthRootPriceRatio: bigint;
    endFourthRootPriceRatio: bigint;
    priceRatioUpdateStartTime: bigint;
    priceRatioUpdateEndTime: bigint;
};

type ReClammImmutable = {
    tokens: bigint[];
    scalingFactors: bigint[];
    initialMinPrice: bigint;
    initialMaxPrice: bigint;
    initialTargetPrice: bigint;
    initialPriceShiftDailyRate: bigint;
    initialCenterednessMargin: bigint;
    minCenterednessMargin: bigint;
    maxCenterednessMargin: bigint;
    minTokenBalanceScaled18: bigint;
    minPoolCenteredness: bigint;
    maxPriceShiftDailyRate: bigint;
    minPriceRatioUpdateDuration: bigint;
    minFourthRootPriceRatioDelta: bigint;
};

type TransformBigintToString<T> = {
    [K in keyof T]: T[K] extends bigint
        ? string
        : T[K] extends bigint[]
          ? string[]
          : T[K];
};

export class ReClammPool {
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
    ): Promise<TransformBigintToString<ReClammImmutable>> {
        const poolTokensCall = {
            address: this.vault,
            abi: vaultExtensionAbi_V3,
            functionName: 'getPoolTokenInfo',
            args: [address],
        } as const;
        const tokenRatesCall = {
            address: this.vault,
            abi: vaultExtensionAbi_V3,
            functionName: 'getPoolTokenRates',
            args: [address],
        } as const;
        const immutableDataCall = {
            address,
            abi: reclammAbi,
            functionName: 'getReClammPoolImmutableData',
        } as const;
        const multicallResult = await this.client.multicall({
            contracts: [poolTokensCall, tokenRatesCall, immutableDataCall],
            allowFailure: false,
            blockNumber,
        });

        return {
            tokens: multicallResult[0][0].map((token) => token),
            scalingFactors: multicallResult[1][0].map((sf) => sf.toString()),
            initialMinPrice: multicallResult[2].initialMinPrice.toString(),
            initialMaxPrice: multicallResult[2].initialMaxPrice.toString(),
            initialTargetPrice: multicallResult[2].initialTargetPrice.toString(),
            initialPriceShiftDailyRate: multicallResult[2].initialPriceShiftDailyRate.toString(),
            initialCenterednessMargin: multicallResult[2].initialCenterednessMargin.toString(),
            minCenterednessMargin: multicallResult[2].minCenterednessMargin.toString(),
            maxCenterednessMargin: multicallResult[2].maxCenterednessMargin.toString(),
            minTokenBalanceScaled18: multicallResult[2].minTokenBalanceScaled18.toString(),
            minPoolCenteredness: multicallResult[2].minPoolCenteredness.toString(),
            maxPriceShiftDailyRate: multicallResult[2].maxPriceShiftDailyRate.toString(),
            minPriceRatioUpdateDuration: multicallResult[2].minPriceRatioUpdateDuration.toString(),
            minFourthRootPriceRatioDelta: multicallResult[2].minFourthRootPriceRatioDelta.toString(),
        };
    }

    async fetchMutableData(
        address: Address,
        blockNumber: bigint,
    ): Promise<TransformBigintToString<ReClammMutable>> {
        const poolConfigCall = {
            address: this.vault,
            abi: vaultExplorerAbi,
            functionName: 'getPoolConfig',
            args: [address],
        } as const;
        const dynamicDataCall = {
            address,
            abi: reclammAbi,
            functionName: 'getReClammPoolDynamicData',
        } as const;

        const multicallResult = await this.client.multicall({
            contracts: [
                poolConfigCall,
                dynamicDataCall,
            ],
            allowFailure: false,
            blockNumber,
        });
        return {
            aggregateSwapFee: multicallResult[0].aggregateSwapFeePercentage.toString(),
            swapFee: multicallResult[1].staticSwapFeePercentage.toString(),
            totalSupply: multicallResult[1].totalSupply.toString(),
            balancesLiveScaled18: multicallResult[1].balancesLiveScaled18.map((b) => b.toString()),
            tokenRates: multicallResult[1].tokenRates.map((b) => b.toString()),
            lastTimestamp: multicallResult[1].lastTimestamp.toString(),
            lastVirtualBalances: multicallResult[1].lastVirtualBalances.map((b) => b.toString()),
            priceShiftDailyRateInSeconds: multicallResult[1].priceShiftDailyRateInSeconds.toString(),
            centerednessMargin: multicallResult[1].centerednessMargin.toString(),
            currentFourthRootPriceRatio: multicallResult[1].currentFourthRootPriceRatio.toString(),
            startFourthRootPriceRatio: multicallResult[1].startFourthRootPriceRatio.toString(),
            endFourthRootPriceRatio: multicallResult[1].endFourthRootPriceRatio.toString(),
            priceRatioUpdateStartTime: multicallResult[1].priceRatioUpdateStartTime.toString(),
            priceRatioUpdateEndTime: multicallResult[1].priceRatioUpdateEndTime.toString(),
        };
    }
}

import {
    type PublicClient,
    createPublicClient,
    http,
    type Address,
    parseAbi,
    type Chain,
} from 'viem';
import { CHAINS, VAULT_V3, vaultExtensionV3Abi } from '@balancer/sdk';

type StableMutable = {
    amp: bigint;
    swapFee: bigint;
    totalSupply: bigint;
    balancesLiveScaled18: bigint[];
    tokenRates: bigint[];
};

type StableImmutable = {
    tokens: bigint[];
    scalingFactors: bigint[];
};

type TransformBigintToString<T> = {
    [K in keyof T]: T[K] extends bigint
        ? string
        : T[K] extends bigint[]
          ? string[]
          : T[K];
};

export class StablePool {
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
    ): Promise<TransformBigintToString<StableImmutable>> {
        const poolTokensCall = {
            address: this.vault,
            abi: vaultExtensionV3Abi,
            functionName: 'getPoolTokenInfo',
            args: [address],
        } as const;
        const tokenRatesCall = {
            address: this.vault,
            abi: vaultExtensionV3Abi,
            functionName: 'getPoolTokenRates',
            args: [address],
        } as const;
        const multicallResult = await this.client.multicall({
            contracts: [poolTokensCall, tokenRatesCall],
            allowFailure: false,
        });
        return {
            tokens: multicallResult[0][0].map((token) => token),
            scalingFactors: multicallResult[1][0].map((sf) => sf.toString()),
        };
    }

    async fetchMutableData(
        address: Address,
    ): Promise<TransformBigintToString<StableMutable>> {
        const staticSwapFeeCall = {
            address: this.vault,
            abi: vaultExtensionV3Abi,
            functionName: 'getStaticSwapFeePercentage',
            args: [address],
        } as const;
        const totalSupplyCall = {
            address: this.vault,
            abi: parseAbi([
                'function totalSupply(address token) external view returns (uint256)',
            ]),
            functionName: 'totalSupply',
            args: [address],
        } as const;
        const liveBalancesCall = {
            address: this.vault,
            abi: vaultExtensionV3Abi,
            functionName: 'getCurrentLiveBalances',
            args: [address],
        } as const;
        const tokenRatesCall = {
            address: this.vault,
            abi: vaultExtensionV3Abi,
            functionName: 'getPoolTokenRates',
            args: [address],
        } as const;
        const amplificationParameterCall = {
            address,
            abi: parseAbi([
                'function getAmplificationParameter() external view returns (uint256 value, bool isUpdating, uint256 precision)',
            ]),
            functionName: 'getAmplificationParameter',
        } as const;

        const multicallResult = await this.client.multicall({
            contracts: [
                staticSwapFeeCall,
                totalSupplyCall,
                liveBalancesCall,
                tokenRatesCall,
                amplificationParameterCall,
            ],
            allowFailure: false,
        });
        return {
            swapFee: multicallResult[0].toString(),
            totalSupply: multicallResult[1].toString(),
            balancesLiveScaled18: multicallResult[2].map((b) => b.toString()),
            tokenRates: multicallResult[3][1].map((b) => b.toString()),
            amp: multicallResult[4][0].toString(),
        };
    }
}

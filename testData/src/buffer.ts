import {
    type PublicClient,
    createPublicClient,
    http,
    type Address,
    type Chain,
    erc4626Abi,
    erc20Abi,
} from 'viem';
import { CHAINS, VAULT_V3 } from '@balancer/sdk';
import { TransformBigintToString } from './types';

export type BufferImmutable = {
    tokens: Address[];
    scalingFactor: bigint;
};

type BufferMutable = {
    rate: bigint;
};

export class BufferPool {
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
    ): Promise<TransformBigintToString<BufferImmutable>> {
        const asset = await this.client.readContract({
            address,
            abi: erc4626Abi,
            functionName: 'asset',
            blockNumber,
        });

        const [mainDecimals, underlyingDecimals] = await Promise.all([
            this.client.readContract({
                address,
                abi: erc20Abi,
                functionName: 'decimals',
                blockNumber,
            }),
            this.client.readContract({
                address: asset,
                abi: erc20Abi,
                functionName: 'decimals',
                blockNumber,
            }),
        ]);

        const scalingFactor = 10n ** BigInt(mainDecimals - underlyingDecimals);

        return {
            tokens: [address, asset],
            scalingFactor: scalingFactor.toString(),
        };
    }

    async fetchMutableData(
        address: Address,
        blockNumber: bigint,
        scalingFactor: bigint,
    ): Promise<TransformBigintToString<BufferMutable>> {
        const convertToAssetsInput = 1000000000000000000n * scalingFactor;
        const rate = await this.client.readContract({
            address,
            abi: erc4626Abi,
            functionName: 'convertToAssets',
            args: [convertToAssetsInput],
            blockNumber,
        });
        return {
            rate: rate.toString(),
        };
    }
}

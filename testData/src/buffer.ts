import {
    type PublicClient,
    createPublicClient,
    http,
    type Address,
    type Chain,
    erc4626Abi,
} from 'viem';
import { CHAINS, VAULT_V3 } from '@balancer/sdk';
import { TransformBigintToString } from './types';

export type BufferImmutable = {
    tokens: Address[];
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

        return {
            tokens: [address, asset],
        };
    }

    async fetchMutableData(
        address: Address,
        blockNumber: bigint,
    ): Promise<TransformBigintToString<BufferMutable>> {
        const rate = await this.client.readContract({
            address,
            abi: erc4626Abi,
            functionName: 'convertToAssets',
            args: [1000000000000000000n],
            blockNumber,
        });
        return {
            rate: rate.toString(),
        };
    }
}

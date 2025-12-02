import type { Address, PublicClient } from 'viem';
import stableSurgeHookAbi from '../../abi/stableSurgeHookAbi';

export async function fetchStableSurgeDynamicData(
    client: PublicClient,
    hookAddress: Address,
    poolAddress: Address,
    blockNumber: bigint,
): Promise<Record<string, string>> {
    const [surgeThresholdPercentage, maxSurgeFeePercentage] =
        await client.multicall({
            contracts: [
                {
                    address: hookAddress,
                    abi: stableSurgeHookAbi,
                    functionName: 'getSurgeThresholdPercentage',
                    args: [poolAddress],
                },
                {
                    address: hookAddress,
                    abi: stableSurgeHookAbi,
                    functionName: 'getMaxSurgeFeePercentage',
                    args: [poolAddress],
                },
            ],
            blockNumber,
        });

    if (surgeThresholdPercentage.status !== 'success') {
        throw new Error(
            `Failed to fetch surgeThresholdPercentage: ${surgeThresholdPercentage.error}`,
        );
    }

    if (maxSurgeFeePercentage.status !== 'success') {
        throw new Error(
            `Failed to fetch maxSurgeFeePercentage: ${maxSurgeFeePercentage.error}`,
        );
    }

    return {
        surgeThresholdPercentage: surgeThresholdPercentage.result.toString(),
        maxSurgeFeePercentage: maxSurgeFeePercentage.result.toString(),
    };
}

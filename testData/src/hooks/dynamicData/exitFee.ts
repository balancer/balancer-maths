import type { Address, PublicClient } from 'viem';
import exitFeeHookAbi from '../../abi/exitFeeHookAbi';

export async function fetchExitFeeDynamicData(
    client: PublicClient,
    hookAddress: Address,
    blockNumber: bigint,
): Promise<Record<string, string>> {
    const exitFeePercentage = await client.readContract({
        address: hookAddress,
        abi: exitFeeHookAbi,
        functionName: 'exitFeePercentage',
        blockNumber,
    });

    return {
        removeLiquidityFeePercentage: exitFeePercentage.toString(),
    };
}

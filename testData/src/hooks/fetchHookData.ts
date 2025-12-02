import type { Address, Chain } from 'viem';
import { createPublicClient, http } from 'viem';
import type { HookData } from './types';
import { getHookType } from './config';
import { vaultExplorerAbi } from '../abi/vaultExplorer';
import { fetchExitFeeDynamicData } from './dynamicData/exitFee';
import { fetchStableSurgeDynamicData } from './dynamicData/stableSurge';
import { CHAINS, VAULT_V3 } from '@balancer/sdk';

export async function fetchHookData(
    rpcUrl: string,
    chainId: number,
    poolAddress: Address,
    blockNumber: bigint,
): Promise<HookData | undefined> {
    // Create client following getPool pattern
    const client = createPublicClient({
        transport: http(rpcUrl),
        chain: CHAINS[chainId] as Chain,
    });

    // Get vault address from chain config
    const vaultAddress = VAULT_V3[chainId];

    // Fetch hook config from vault - will throw if fails (per user requirement)
    const hookConfig = await client.readContract({
        address: vaultAddress,
        abi: vaultExplorerAbi,
        functionName: 'getHooksConfig',
        args: [poolAddress],
        blockNumber,
    });

    // If no hook address, return undefined
    if (
        !hookConfig.hooksContract ||
        hookConfig.hooksContract ===
            '0x0000000000000000000000000000000000000000'
    ) {
        return undefined;
    }

    const hookAddress = hookConfig.hooksContract;
    const hookType = getHookType(chainId, hookAddress);

    // Build base hook data from config
    const hookData: HookData = {
        address: hookAddress,
        type: hookType,
        enableHookAdjustedAmounts: hookConfig.enableHookAdjustedAmounts,
        shouldCallAfterSwap: hookConfig.shouldCallAfterSwap,
        shouldCallBeforeSwap: hookConfig.shouldCallBeforeSwap,
        shouldCallAfterInitialize: hookConfig.shouldCallAfterInitialize,
        shouldCallBeforeInitialize: hookConfig.shouldCallBeforeInitialize,
        shouldCallAfterAddLiquidity: hookConfig.shouldCallAfterAddLiquidity,
        shouldCallBeforeAddLiquidity: hookConfig.shouldCallBeforeAddLiquidity,
        shouldCallAfterRemoveLiquidity:
            hookConfig.shouldCallAfterRemoveLiquidity,
        shouldCallBeforeRemoveLiquidity:
            hookConfig.shouldCallBeforeRemoveLiquidity,
        shouldCallComputeDynamicSwapFee:
            hookConfig.shouldCallComputeDynamicSwapFee,
    };

    // Fetch hook-specific dynamic data based on hook type
    switch (hookType) {
        case 'EXIT_FEE':
            hookData.dynamicData = await fetchExitFeeDynamicData(
                client,
                hookAddress,
                blockNumber,
            );
            break;
        case 'STABLE_SURGE':
            hookData.dynamicData = await fetchStableSurgeDynamicData(
                client,
                hookAddress,
                poolAddress,
                blockNumber,
            );
            break;
        case 'FEE_TAKING':
        case 'MEV_TAX':
        case 'UNKNOWN':
            // No dynamic data for these hook types
            break;
    }

    return hookData;
}

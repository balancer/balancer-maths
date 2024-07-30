import { RemoveKind } from '../vault/types';
import { HookBase } from './types';
import { MathSol } from '../utils/math';

export type HookStateExitFee = {
    tokens: string[];
    removeLiquidityHookFeePercentage: bigint;
};

/**
 * This hook implements the ExitFeeHookExample found in mono-repo: https://github.com/balancer/balancer-v3-monorepo/blob/c848c849cb44dc35f05d15858e4fba9f17e92d5e/pkg/pool-hooks/contracts/ExitFeeHookExample.sol
 */
export class ExitFeeHook implements HookBase {
    public shouldCallComputeDynamicSwapFee = false;
    public shouldCallBeforeSwap = false;
    public shouldCallAfterSwap = false;
    public shouldCallBeforeAddLiquidity = false;
    public shouldCallAfterAddLiquidity = false;
    public shouldCallBeforeRemoveLiquidity = false;
    public shouldCallAfterRemoveLiquidity = true;
    public enableHookAdjustedAmounts = true;

    onBeforeAddLiquidity() {
        return { success: false, hookAdjustedBalancesScaled18: [] };
    }
    onAfterAddLiquidity() {
        return { success: false, hookAdjustedAmountsInRaw: [] };
    }
    onBeforeRemoveLiquidity() {
        return { success: false, hookAdjustedBalancesScaled18: [] };
    }
    onAfterRemoveLiquidity(
        kind: RemoveKind,
        bptAmountIn: bigint,
        amountsOutScaled18: bigint[],
        amountsOutRaw: bigint[],
        balancesScaled18: bigint[],
        hookState: HookStateExitFee,
    ) {
        if (
            !(
                typeof hookState === 'object' &&
                hookState !== null &&
                'removeLiquidityHookFeePercentage' in hookState &&
                'tokens' in hookState
            )
        )
            throw new Error('Unexpected hookState');

        // Our current architecture only supports fees on tokens. Since we must always respect exact `amountsOut`, and
        // non-proportional remove liquidity operations would require taking fees in BPT, we only support proportional
        // removeLiquidity.
        if (kind !== RemoveKind.PROPORTIONAL) {
            throw new Error(`ExitFeeHook: Unsupported RemoveKind: ${kind}`);
        }
        const accruedFees = new Array(hookState.tokens.length).fill(0n);
        const hookAdjustedAmountsOutRaw = [...amountsOutRaw];
        if (hookState.removeLiquidityHookFeePercentage > 0) {
            // Charge fees proportional to amounts out of each token
            for (let i = 0; i < amountsOutRaw.length; i++) {
                const hookFee = MathSol.mulDownFixed(
                    amountsOutRaw[i],
                    hookState.removeLiquidityHookFeePercentage,
                );
                accruedFees[i] = hookFee;
                hookAdjustedAmountsOutRaw[i] -= hookFee;
                // Fees don't need to be transferred to the hook, because donation will reinsert them in the vault
            }

            // In SC Hook Donates accrued fees back to LPs
            // _vault.addLiquidity(
            //     AddLiquidityParams({
            //         pool: pool,
            //         to: msg.sender, // It would mint BPTs to router, but it's a donation so no BPT is minted
            //         maxAmountsIn: accruedFees, // Donate all accrued fees back to the pool (i.e. to the LPs)
            //         minBptAmountOut: 0, // Donation does not return BPTs, any number above 0 will revert
            //         kind: AddLiquidityKind.DONATION,
            //         userData: bytes(''), // User data is not used by donation, so we can set to an empty string
            //     }),
            // );
        }

        return {
            success: true,
            hookAdjustedAmountsOutRaw,
        };
    }
    onBeforeSwap() {
        return { success: false, hookAdjustedBalancesScaled18: [] };
    }
    onAfterSwap() {
        return { success: false, hookAdjustedAmountCalculatedRaw: 0n };
    }
    onComputeDynamicSwapFee() {
        return { success: false, dynamicSwapFee: 0n };
    }
}

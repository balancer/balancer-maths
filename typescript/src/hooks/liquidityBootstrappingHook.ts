import { HookBase, HookStateBase } from './types';
import { RemoveKind, AddKind } from '../vault/types';
import { isSameAddress } from '../vault/utils';

export type HookStateLiquidityBootstrapping = HookStateBase & {
    hookType: 'LiquidityBootstrapping';
    lbpOwner: string;
    endTime: bigint;
    sender: string;
    currentTimestamp: bigint;
};

export class LiquidityBootstrappingHook implements HookBase {
    public shouldCallComputeDynamicSwapFee = false;
    public shouldCallBeforeSwap = false;
    public shouldCallAfterSwap = false;
    public shouldCallBeforeAddLiquidity = true;
    public shouldCallAfterAddLiquidity = false;
    public shouldCallBeforeRemoveLiquidity = true;
    public shouldCallAfterRemoveLiquidity = false;
    public enableHookAdjustedAmounts = false;

    onBeforeAddLiquidity(
        kind: AddKind,
        maxAmountsInScaled18: bigint[],
        minBptAmountOut: bigint,
        balancesScaled18: bigint[],
        hookState: HookStateLiquidityBootstrapping,
    ) {
        // validtate if the liquidity adder is the lbp power
        if (!isSameAddress(hookState.sender, hookState.lbpOwner)) {
            throw new Error('Liquidity adder is not the lbp owner');
        }
        return {
            success: true,
            hookAdjustedBalancesScaled18: balancesScaled18,
        };
    }
    onAfterAddLiquidity() {
        return { success: false, hookAdjustedAmountsInRaw: [] };
    }
    onBeforeRemoveLiquidity(
        kind: RemoveKind,
        maxBptAmountIn: bigint,
        minAmountsOutScaled18: bigint[],
        balancesScaled18: bigint[],
        hookState: HookStateLiquidityBootstrapping,
    ) {
        // validate if the lbp has ended
        if (hookState.currentTimestamp < hookState.endTime) {
            throw new Error('LBP has not ended yet');
        }

        return {
            success: true,
            hookAdjustedBalancesScaled18: balancesScaled18,
        };
    }
    onAfterRemoveLiquidity() {
        return { success: false, hookAdjustedAmountsOutRaw: [] };
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

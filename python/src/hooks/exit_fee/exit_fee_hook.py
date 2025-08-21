from src.common.maths import mul_down_fixed
from src.common.types import RemoveLiquidityKind
from src.hooks.default_hook import DefaultHook
from src.hooks.exit_fee.types import ExitFeeHookState
from src.hooks.types import AfterRemoveLiquidityResult


# This hook implements the ExitFeeHookExample found in mono-repo: https://github.com/balancer/balancer-v3-monorepo/blob/c848c849cb44dc35f05d15858e4fba9f17e92d5e/pkg/pool-hooks/contracts/ExitFeeHookExample.sol
class ExitFeeHook(DefaultHook):
    should_call_after_remove_liquidity = True
    enable_hook_adjusted_amounts = True

    def on_after_remove_liquidity(
        self,
        kind: RemoveLiquidityKind,
        bpt_amount_in: int,
        amounts_out_scaled18: list[int],
        amounts_out_raw: list[int],
        balances_scaled18: list[int],
        hook_state: ExitFeeHookState | object | None,
    ) -> AfterRemoveLiquidityResult:

        # // Our current architecture only supports fees on tokens. Since we must always respect exact `amountsOut`, and
        # // non-proportional remove liquidity operations would require taking fees in BPT, we only support proportional
        # // removeLiquidity.
        if kind != RemoveLiquidityKind.PROPORTIONAL:
            raise ValueError("ExitFeeHook: Unsupported RemoveLiquidityKind: ", kind)

        if not isinstance(hook_state, ExitFeeHookState):
            return AfterRemoveLiquidityResult(
                success=False, hook_adjusted_amounts_out_raw=[]
            )

        accrued_fees = [0] * len(hook_state.tokens)
        hook_adjusted_amounts_out_raw = amounts_out_raw[:]
        if hook_state.remove_liquidity_hook_fee_percentage > 0:
            # Charge fees proportional to amounts out of each token

            for i, amount_out in enumerate(amounts_out_raw):
                hook_fee = mul_down_fixed(
                    amount_out,
                    hook_state.remove_liquidity_hook_fee_percentage,
                )
                accrued_fees[i] = hook_fee
                hook_adjusted_amounts_out_raw[i] -= hook_fee
                # Fees don't need to be transferred to the hook, because donation will reinsert them in the vault

            # // In SC Hook Donates accrued fees back to LPs
            # // _vault.addLiquidity(
            # //     AddLiquidityParams({
            # //         pool: pool,
            # //         to: msg.sender, // It would mint BPTs to router, but it's a donation so no BPT is minted
            # //         maxAmountsIn: accruedFees, // Donate all accrued fees back to the pool (i.e. to the LPs)
            # //         minBptAmountOut: 0, // Donation does not return BPTs, any number above 0 will revert
            # //         kind: AddLiquidityKind.DONATION,
            # //         userData: bytes(''), // User data is not used by donation, so we can set to an empty string
            # //     }),
            # // );

        return AfterRemoveLiquidityResult(
            success=True,
            hook_adjusted_amounts_out_raw=hook_adjusted_amounts_out_raw,
        )

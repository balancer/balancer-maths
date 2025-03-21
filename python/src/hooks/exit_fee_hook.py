from src.remove_liquidity import RemoveKind
from src.maths import mul_down_fixed


# This hook implements the ExitFeeHookExample found in mono-repo: https://github.com/balancer/balancer-v3-monorepo/blob/c848c849cb44dc35f05d15858e4fba9f17e92d5e/pkg/pool-hooks/contracts/ExitFeeHookExample.sol
class ExitFeeHook:
    def __init__(self):
        self.should_call_compute_dynamic_swap_fee = False
        self.should_call_before_swap = False
        self.should_call_after_swap = False
        self.should_call_before_add_liquidity = False
        self.should_call_after_add_liquidity = False
        self.should_call_before_remove_liquidity = False
        self.should_call_after_remove_liquidity = True
        self.enable_hook_adjusted_amounts = True

    def on_before_add_liquidity(self):
        return {"success": False, "hook_adjusted_balances_scaled18": []}

    def on_after_add_liquidity(
        self,
    ):
        return {"success": False, "hook_adjusted_amounts_in_raw": []}

    def on_before_remove_liquidity(self):
        return {"success": False, "hook_adjusted_balances_scaled18": []}

    def on_after_remove_liquidity(
        self,
        kind,
        _bpt_amount_in,
        _amounts_out_scaled18,
        amounts_out_raw,
        _balances_scaled18,
        hook_state,
    ):
        if not (
            isinstance(hook_state, dict)
            and hook_state is not None
            and "removeLiquidityHookFeePercentage" in hook_state
            and "tokens" in hook_state
        ):
            raise ValueError("Unexpected hookState")

        # // Our current architecture only supports fees on tokens. Since we must always respect exact `amountsOut`, and
        # // non-proportional remove liquidity operations would require taking fees in BPT, we only support proportional
        # // removeLiquidity.
        if kind != RemoveKind.PROPORTIONAL.value:
            raise ValueError("ExitFeeHook: Unsupported RemoveKind: ", kind)

        accrued_fees = [0] * len(hook_state["tokens"])
        hook_adjusted_amounts_out_raw = amounts_out_raw[:]
        if hook_state["removeLiquidityHookFeePercentage"] > 0:
            # Charge fees proportional to amounts out of each token

            for i in range(len(amounts_out_raw)):
                hook_fee = mul_down_fixed(
                    amounts_out_raw[i],
                    hook_state["removeLiquidityHookFeePercentage"],
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

        return {
            "success": True,
            "hook_adjusted_amounts_out_raw": hook_adjusted_amounts_out_raw,
        }

    def on_before_swap(self):
        return {"success": False, "hook_adjusted_balances_scaled18": []}

    def on_after_swap(self):
        return {"success": False, "hook_adjusted_amount_calculated_raw": 0}

    def on_compute_dynamic_swap_fee(self):
        return {"success": False, "dynamic_swap_fee": 0}

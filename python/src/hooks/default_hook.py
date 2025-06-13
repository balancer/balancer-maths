from src.hooks.types import (
    HookBase,
    AfterSwapParams,
    DynamicSwapFeeResult,
    BeforeSwapResult,
    AfterSwapResult,
    BeforeAddLiquidityResult,
    AfterAddLiquidityResult,
    BeforeRemoveLiquidityResult,
    AfterRemoveLiquidityResult,
)
from src.common.swap_params import SwapParams
from src.common.types import AddLiquidityKind, RemoveLiquidityKind


class DefaultHook(HookBase):
    should_call_compute_dynamic_swap_fee = False
    should_call_before_swap = False
    should_call_after_swap = False
    should_call_before_add_liquidity = False
    should_call_after_add_liquidity = False
    should_call_before_remove_liquidity = False
    should_call_after_remove_liquidity = False
    enable_hook_adjusted_amounts = False

    def on_compute_dynamic_swap_fee(
        self,
        swap_params: SwapParams,
        static_swap_fee_percentage: int,
        hook_state: dict,
    ) -> DynamicSwapFeeResult:
        return DynamicSwapFeeResult(success=False, dynamic_swap_fee=0)

    def on_before_add_liquidity(
        self,
        kind: AddLiquidityKind,
        max_amounts_in_scaled18: list[int],
        min_bpt_amount_out: int,
        balances_scaled18: list[int],
        hook_state: dict,
    ) -> BeforeAddLiquidityResult:
        return BeforeAddLiquidityResult(
            success=False, hook_adjusted_balances_scaled18=[]
        )

    def on_after_add_liquidity(
        self,
        kind: AddLiquidityKind,
        amounts_in_scaled18: list[int],
        amounts_in_raw: list[int],
        bpt_amount_out: int,
        balances_scaled18: list[int],
        hook_state: dict,
    ) -> AfterAddLiquidityResult:
        return AfterAddLiquidityResult(success=False, hook_adjusted_amounts_in_raw=[])

    def on_before_remove_liquidity(
        self,
        kind: RemoveLiquidityKind,
        max_bpt_amount_in: int,
        min_amounts_out_scaled18: list[int],
        balances_scaled18: list[int],
        hook_state: dict,
    ) -> BeforeRemoveLiquidityResult:
        return BeforeRemoveLiquidityResult(
            success=False, hook_adjusted_balances_scaled18=[]
        )

    def on_after_remove_liquidity(
        self,
        kind: RemoveLiquidityKind,
        bpt_amount_in: int,
        amounts_out_scaled18: list[int],
        amounts_out_raw: list[int],
        balances_scaled18: list[int],
        hook_state: dict,
    ) -> AfterRemoveLiquidityResult:
        return AfterRemoveLiquidityResult(
            success=False, hook_adjusted_amounts_out_raw=[]
        )

    def on_before_swap(
        self,
        swap_params: SwapParams,
        hook_state: dict,
    ) -> BeforeSwapResult:
        return BeforeSwapResult(success=False, hook_adjusted_balances_scaled18=[])

    def on_after_swap(
        self,
        after_swap_params: AfterSwapParams,
        hook_state: dict,
    ) -> AfterSwapResult:
        return AfterSwapResult(success=False, hook_adjusted_amount_calculated_raw=0)

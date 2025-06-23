from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import List

from src.common.swap_params import SwapParams
from src.common.types import AddLiquidityKind, RemoveLiquidityKind, SwapKind
from src.hooks.exit_fee.types import ExitFeeHookState
from src.hooks.stable_surge.types import StableSurgeHookState

HookState = StableSurgeHookState | ExitFeeHookState


@dataclass
class AfterSwapParams:
    kind: SwapKind
    token_in: str  # IERC20 address
    token_out: str  # IERC20 address
    amount_in_scaled18: int
    amount_out_scaled18: int
    token_in_balance_scaled18: int
    token_out_balance_scaled18: int
    amount_calculated_scaled18: int
    amount_calculated_raw: int


@dataclass
class DynamicSwapFeeResult:
    success: bool
    dynamic_swap_fee: int


@dataclass
class BeforeSwapResult:
    success: bool
    hook_adjusted_balances_scaled18: List[int]


@dataclass
class AfterSwapResult:
    success: bool
    hook_adjusted_amount_calculated_raw: int


@dataclass
class BeforeAddLiquidityResult:
    success: bool
    hook_adjusted_balances_scaled18: List[int]


@dataclass
class AfterAddLiquidityResult:
    success: bool
    hook_adjusted_amounts_in_raw: List[int]


@dataclass
class BeforeRemoveLiquidityResult:
    success: bool
    hook_adjusted_balances_scaled18: List[int]


@dataclass
class AfterRemoveLiquidityResult:
    success: bool
    hook_adjusted_amounts_out_raw: List[int]


class HookBase(ABC):
    should_call_compute_dynamic_swap_fee: bool
    should_call_before_swap: bool
    should_call_after_swap: bool
    should_call_before_add_liquidity: bool
    should_call_after_add_liquidity: bool
    should_call_before_remove_liquidity: bool
    should_call_after_remove_liquidity: bool
    enable_hook_adjusted_amounts: bool

    @abstractmethod
    def on_before_add_liquidity(
        self,
        kind: AddLiquidityKind,
        max_amounts_in_scaled18: list[int],
        min_bpt_amount_out: int,
        balances_scaled18: list[int],
        hook_state: HookState | object | None,
    ) -> BeforeAddLiquidityResult: ...

    @abstractmethod
    def on_after_add_liquidity(
        self,
        kind: AddLiquidityKind,
        amounts_in_scaled18: list[int],
        amounts_in_raw: list[int],
        bpt_amount_out: int,
        balances_scaled18: list[int],
        hook_state: HookState | object | None,
    ) -> AfterAddLiquidityResult: ...

    @abstractmethod
    def on_before_remove_liquidity(
        self,
        kind: RemoveLiquidityKind,
        max_bpt_amount_in: int,
        min_amounts_out_scaled18: list[int],
        balances_scaled18: list[int],
        hook_state: HookState | object | None,
    ) -> BeforeRemoveLiquidityResult: ...

    @abstractmethod
    def on_after_remove_liquidity(
        self,
        kind: RemoveLiquidityKind,
        bpt_amount_in: int,
        amounts_out_scaled18: list[int],
        amounts_out_raw: list[int],
        balances_scaled18: list[int],
        hook_state: HookState | object | None,
    ) -> AfterRemoveLiquidityResult: ...

    @abstractmethod
    def on_before_swap(
        self,
        swap_params: SwapParams,
        hook_state: HookState | object | None,
    ) -> BeforeSwapResult: ...

    @abstractmethod
    def on_after_swap(
        self,
        after_swap_params: AfterSwapParams,
        hook_state: HookState | object | None,
    ) -> AfterSwapResult: ...

    @abstractmethod
    def on_compute_dynamic_swap_fee(
        self,
        swap_params: SwapParams,
        static_swap_fee_percentage: int,
        hook_state: HookState | object | None,
    ) -> DynamicSwapFeeResult: ...

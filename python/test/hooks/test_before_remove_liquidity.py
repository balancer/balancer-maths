import pytest
import sys
import os

from src.add_liquidity import AddLiquidityKind
from src.swap import SwapParams
from src.common.types import RemoveLiquidityKind, AddLiquidityKind, RemoveLiquidityInput
from src.vault import Vault
from hooks.types import (
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

# Get the directory of the current file
current_file_dir = os.path.dirname(os.path.abspath(__file__))
# Get the parent directory (one level up)
parent_dir = os.path.dirname(os.path.dirname(current_file_dir))

# Insert the parent directory at the start of sys.path
sys.path.insert(0, parent_dir)


remove_liquidity_input = RemoveLiquidityInput(
    pool="0xb2456a6f51530053bc41b0ee700fe6a2c37282e8",
    min_amounts_out_raw=[0, 1],
    max_bpt_amount_in_raw=100000000000000000,
    kind=RemoveLiquidityKind.SINGLE_TOKEN_EXACT_IN,
)


class CustomPool:
    def __init__(self, pool_state):
        self.pool_state = pool_state

    def get_maximum_invariant_ratio(self) -> int:
        return 1

    def get_minimum_invariant_ratio(self) -> int:
        return 1

    def on_swap(self, swap_params):
        return 1

    def compute_invariant(self, balances_live_scaled18):
        return 1

    def compute_balance(
        self,
        balances_live_scaled18,
        token_in_index,
        invariant_ratio,
    ):
        return 1


class CustomHook(HookBase):
    def __init__(self):
        self.should_call_compute_dynamic_swap_fee = False
        self.should_call_before_swap = False
        self.should_call_after_swap = False
        self.should_call_before_add_liquidity = False
        self.should_call_after_add_liquidity = False
        self.should_call_before_remove_liquidity = True
        self.should_call_after_remove_liquidity = False
        self.enable_hook_adjusted_amounts = False

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
        kind,
        amounts_in_scaled18,
        amounts_in_raw,
        bpt_amount_out,
        balances_scaled18,
        hook_state,
    ) -> AfterAddLiquidityResult:
        return AfterAddLiquidityResult(success=False, hook_adjusted_amounts_in_raw=[])

    def on_before_remove_liquidity(
        self,
        kind,
        max_bpt_amount_in,
        min_amounts_out_scaled18,
        balances_scaled18,
        hook_state,
    ) -> BeforeRemoveLiquidityResult:
        if not (
            isinstance(hook_state, dict)
            and hook_state is not None
            and "balanceChange" in hook_state
        ):
            raise ValueError("Unexpected hookState")
        assert kind == remove_liquidity_input.kind
        assert max_bpt_amount_in == remove_liquidity_input.max_bpt_amount_in_raw
        assert min_amounts_out_scaled18 == remove_liquidity_input.min_amounts_out_raw
        assert balances_scaled18 == pool["balancesLiveScaled18"]

        return BeforeRemoveLiquidityResult(
            success=True,
            hook_adjusted_balances_scaled18=hook_state["balanceChange"],
        )

    def on_after_remove_liquidity(
        self,
        kind,
        bpt_amount_in,
        amounts_out_scaled18,
        amounts_out_raw,
        balances_scaled18,
        hook_state,
    ) -> AfterRemoveLiquidityResult:
        return AfterRemoveLiquidityResult(
            success=False, hook_adjusted_amounts_out_raw=[]
        )

    def on_before_swap(
        self, swap_params: SwapParams, hook_state: dict
    ) -> BeforeSwapResult:
        return BeforeSwapResult(success=False, hook_adjusted_balances_scaled18=[])

    def on_after_swap(
        self, after_swap_params: AfterSwapParams, hook_state: dict
    ) -> AfterSwapResult:
        return AfterSwapResult(success=False, hook_adjusted_amount_calculated_raw=0)

    def on_compute_dynamic_swap_fee(
        self,
        swap_params: SwapParams,
        static_swap_fee_percentage: int,
        hook_state: dict,
    ) -> DynamicSwapFeeResult:
        return DynamicSwapFeeResult(success=False, dynamic_swap_fee=0)


pool = {
    "poolType": "CustomPool",
    "hookType": "CustomHook",
    "chainId": "11155111",
    "blockNumber": "5955145",
    "poolAddress": "0xb2456a6f51530053bc41b0ee700fe6a2c37282e8",
    "tokens": [
        "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9",
        "0xb19382073c7A0aDdbb56Ac6AF1808Fa49e377B75",
    ],
    "scalingFactors": [1, 1],
    "weights": [500000000000000000, 500000000000000000],
    "swapFee": 100000000000000000,
    "balancesLiveScaled18": [2000000000000000000, 2000000000000000000],
    "tokenRates": [1000000000000000000, 1000000000000000000],
    "totalSupply": 1000000000000000000,
    "aggregateSwapFee": 500000000000000000,
}

vault = Vault(
    custom_pool_classes={"CustomPool": CustomPool},
    custom_hook_classes={"CustomHook": CustomHook},
)


def test_hook_before_remove_liquidity():
    # should alter pool balances
    # hook state is used to pass new balances which give expected result
    input_hook_state = {
        "balanceChange": [1000000000000000000, 1000000000000000000],
    }
    test = vault.remove_liquidity(
        remove_liquidity_input, pool, hook_state=input_hook_state
    )
    assert test["bpt_amount_in_raw"] == remove_liquidity_input.max_bpt_amount_in_raw
    assert test["amounts_out_raw"] == [
        0,
        909999999999999999,
    ]

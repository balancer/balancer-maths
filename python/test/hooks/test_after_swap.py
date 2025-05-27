import pytest
import sys
import os

from src.common.types import SwapKind, SwapInput, SwapParams
from src.add_liquidity import AddLiquidityKind
from src.common.types import RemoveLiquidityKind

from src.vault import Vault
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

# Get the directory of the current file
current_file_dir = os.path.dirname(os.path.abspath(__file__))
# Get the parent directory (one level up)
parent_dir = os.path.dirname(os.path.dirname(current_file_dir))

# Insert the parent directory at the start of sys.path
sys.path.insert(0, parent_dir)


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
    "balancesLiveScaled18": [1000000000000000000, 1000000000000000000],
    "tokenRates": [1000000000000000000, 1000000000000000000],
    "totalSupply": 1000000000000000000,
    "aggregateSwapFee": 500000000000000000,
}


swap_input = SwapInput(
    amount_raw=1000000000000000000,
    swap_kind=SwapKind.GIVENIN,
    token_in=pool["tokens"][0],
    token_out=pool["tokens"][1],
)

expected_calculated = 100000000000


class CustomPool:
    def __init__(self, pool_state):
        self.pool_state = pool_state

    def on_swap(self, swap_params):
        return 100000000000

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
        self.should_call_after_swap = True
        self.should_call_before_add_liquidity = False
        self.should_call_after_add_liquidity = False
        self.should_call_before_remove_liquidity = False
        self.should_call_after_remove_liquidity = False
        self.enable_hook_adjusted_amounts = True

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
        token_in_balance_scaled18 = after_swap_params.token_in_balance_scaled18
        token_out_balance_scaled18 = after_swap_params.token_out_balance_scaled18
        if not (
            isinstance(hook_state, dict)
            and hook_state is not None
            and "expectedBalancesLiveScaled18" in hook_state
        ):
            raise ValueError("Unexpected hookState")
        assert after_swap_params.kind == swap_input.swap_kind

        assert after_swap_params.token_in == swap_input.token_in
        assert after_swap_params.token_out == swap_input.token_out
        assert after_swap_params.amount_in_scaled18 == swap_input.amount_raw
        assert after_swap_params.amount_calculated_raw == expected_calculated
        assert after_swap_params.amount_calculated_scaled18 == expected_calculated
        assert after_swap_params.amount_out_scaled18 == expected_calculated
        assert [token_in_balance_scaled18, token_out_balance_scaled18] == hook_state[
            "expectedBalancesLiveScaled18"
        ]
        return AfterSwapResult(success=True, hook_adjusted_amount_calculated_raw=1)

    def on_compute_dynamic_swap_fee(
        self,
        swap_params: SwapParams,
        static_swap_fee_percentage: int,
        hook_state: dict,
    ) -> DynamicSwapFeeResult:
        return DynamicSwapFeeResult(success=False, dynamic_swap_fee=0)


vault = Vault(
    custom_pool_classes={"CustomPool": CustomPool},
    custom_hook_classes={"CustomHook": CustomHook},
)


def test_hook_after_swap_no_fee():
    # aggregateSwapFee of 0 should not take any protocol fees from updated balances
    # hook state is used to pass expected value to tests
    # with aggregateFee = 0, balance out is just balance - calculated
    input_hook_state = {
        "expectedBalancesLiveScaled18": [
            pool["balancesLiveScaled18"][0] + swap_input.amount_raw,
            pool["balancesLiveScaled18"][1] - expected_calculated,
        ],
    }
    test = vault.swap(
        swap_input, {**pool, "aggregateSwapFee": 0}, hook_state=input_hook_state
    )
    assert test == 1


def test_hook_after_swap_with_fee():
    # aggregateSwapFee of 50% should take half of remaining
    # hook state is used to pass expected value to tests
    # Aggregate fee amount is 50% of swap fee
    expected_aggregate_swap_fee_amount = 50000000000000000
    input_hook_state = {
        "expectedBalancesLiveScaled18": [
            pool["balancesLiveScaled18"][0]
            + swap_input.amount_raw
            - expected_aggregate_swap_fee_amount,
            pool["balancesLiveScaled18"][1] - expected_calculated,
        ],
    }
    test = vault.swap(swap_input, pool, hook_state=input_hook_state)
    assert test == 1

import sys
import os

from src.pools.weighted.weighted import Weighted
from src.common.types import AddLiquidityInput, AddLiquidityKind

from src.vault import Vault
from src.hooks.types import (
    HookBase,
    BeforeAddLiquidityResult,
    AfterAddLiquidityResult,
    BeforeRemoveLiquidityResult,
    AfterRemoveLiquidityResult,
    BeforeSwapResult,
    AfterSwapResult,
    DynamicSwapFeeResult,
)

# Get the directory of the current file
current_file_dir = os.path.dirname(os.path.abspath(__file__))
# Get the parent directory (one level up)
parent_dir = os.path.dirname(os.path.dirname(current_file_dir))

# Insert the parent directory at the start of sys.path
sys.path.insert(0, parent_dir)


class CustomPool(Weighted):
    def __init__(self, pool_state):
        super().__init__(pool_state)


class CustomHook(HookBase):
    def __init__(self):
        self.should_call_compute_dynamic_swap_fee = False
        self.should_call_before_swap = False
        self.should_call_after_swap = False
        self.should_call_before_add_liquidity = False
        self.should_call_after_add_liquidity = True
        self.should_call_before_remove_liquidity = False
        self.should_call_after_remove_liquidity = False
        self.enable_hook_adjusted_amounts = True

    def on_before_add_liquidity(
        self,
        kind,
        max_amounts_in_scaled18,
        min_bpt_amount_out,
        balances_scaled18,
        hook_state,
    ):
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
    ):
        if not (
            isinstance(hook_state, dict)
            and hook_state is not None
            and "expected_balances_live_scaled18" in hook_state
        ):
            raise ValueError("Unexpected hookState")
        assert kind == add_liquidity_input.kind
        assert bpt_amount_out == 146464294351867896
        assert amounts_in_scaled18 == add_liquidity_input.max_amounts_in_raw
        assert amounts_in_raw == add_liquidity_input.max_amounts_in_raw
        assert balances_scaled18 == hook_state["expected_balances_live_scaled18"]
        return AfterAddLiquidityResult(
            success=True,
            hook_adjusted_amounts_in_raw=[
                amounts_in_raw[0] + 1,
                amounts_in_raw[1] + 1,
            ],
        )

    def on_before_remove_liquidity(
        self,
        kind,
        max_bpt_amount_in,
        min_amounts_out_scaled18,
        balances_scaled18,
        hook_state,
    ):
        return BeforeRemoveLiquidityResult(
            success=False, hook_adjusted_balances_scaled18=[]
        )

    def on_after_remove_liquidity(
        self,
        kind,
        bpt_amount_in,
        amounts_out_scaled18,
        amounts_out_raw,
        balances_scaled18,
        hook_state,
    ):
        return AfterRemoveLiquidityResult(
            success=False, hook_adjusted_amounts_out_raw=[]
        )

    def on_before_swap(self, swap_params, hook_state):
        return BeforeSwapResult(success=False, hook_adjusted_balances_scaled18=[])

    def on_after_swap(self, after_swap_params, hook_state):
        return AfterSwapResult(success=False, hook_adjusted_amount_calculated_raw=0)

    def on_compute_dynamic_swap_fee(
        self, swap_params, static_swap_fee_percentage, hook_state
    ):
        return DynamicSwapFeeResult(success=False, dynamic_swap_fee=0)


add_liquidity_input = AddLiquidityInput(
    pool="0xb2456a6f51530053bc41b0ee700fe6a2c37282e8",
    max_amounts_in_raw=[200000000000000000, 100000000000000000],
    min_bpt_amount_out_raw=0,
    kind=AddLiquidityKind.UNBALANCED,
)

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

vault = Vault(
    custom_pool_classes={"CustomPool": CustomPool},
    custom_hook_classes={"CustomHook": CustomHook},
)


def test_hook_after_add_liquidity_no_fee():
    # aggregateSwapFee of 0 should not take any protocol fees from updated balances
    # hook state is used to pass expected value to tests
    input_hook_state = {
        "expected_balances_live_scaled18": [
            1200000000000000000,
            1100000000000000000,
        ],
    }
    test = vault.add_liquidity(
        add_liquidity_input,
        {**pool, "aggregateSwapFee": 0},
        hook_state=input_hook_state,
    )
    # Hook adds 1n to amountsIn
    assert test["amounts_in_raw"] == [
        200000000000000001,
        100000000000000001,
    ]
    assert test["bpt_amount_out_raw"] == 146464294351867896


def test_hook_after_add_liquidity_with_fee():
    # aggregateSwapFee of 50% should take half of remaining
    # hook state is used to pass expected value to tests
    # aggregate fee amount is 2554373534622012 which is deducted from amount in
    input_hook_state = {
        "expected_balances_live_scaled18": [
            1200000000000000000 - 2554373534622012,
            1100000000000000000,
        ],
    }
    test = vault.add_liquidity(add_liquidity_input, pool, hook_state=input_hook_state)
    # Hook adds 1n to amountsIn
    assert test["amounts_in_raw"] == [
        200000000000000001,
        100000000000000001,
    ]
    assert test["bpt_amount_out_raw"] == 146464294351867896

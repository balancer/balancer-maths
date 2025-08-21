import os
import sys
from test.test_custom_pool import map_custom_pool_state
from types import SimpleNamespace
from typing import Protocol, TypeGuard

from src.common.maths import Rounding
from src.common.pool_base import PoolBase
from src.common.swap_params import SwapParams
from src.common.types import RemoveLiquidityInput, RemoveLiquidityKind
from src.hooks.default_hook import DefaultHook
from src.hooks.types import BeforeRemoveLiquidityResult, HookState
from src.vault.vault import Vault

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


class CustomPool(PoolBase):
    def __init__(self, pool_state):
        self.pool_state = pool_state

    def get_maximum_invariant_ratio(self) -> int:
        return 1

    def get_minimum_invariant_ratio(self) -> int:
        return 1

    def on_swap(self, swap_params: SwapParams) -> int:
        return 1

    def compute_invariant(
        self, balances_live_scaled18: list[int], rounding: Rounding
    ) -> int:
        return 1

    def compute_balance(
        self,
        balances_live_scaled18: list[int],
        token_in_index: int,
        invariant_ratio: int,
    ) -> int:
        return 1


class HasBalanceChange(Protocol):
    balance_change: list


def has_balance_change(obj: object) -> TypeGuard[HasBalanceChange]:
    """Type guard to check if an object has a balance_change attribute."""
    return hasattr(obj, "balance_change")


class CustomHook(DefaultHook):
    def __init__(self):
        super().__init__()
        self.should_call_before_remove_liquidity = True

    def on_before_remove_liquidity(
        self,
        kind: RemoveLiquidityKind,
        max_bpt_amount_in: int,
        min_amounts_out_scaled18: list[int],
        balances_scaled18: list[int],
        hook_state: HookState | object | None,
    ) -> BeforeRemoveLiquidityResult:
        if not has_balance_change(hook_state):
            raise ValueError("Unexpected hookState")
        assert kind == remove_liquidity_input.kind
        assert max_bpt_amount_in == remove_liquidity_input.max_bpt_amount_in_raw
        assert min_amounts_out_scaled18 == remove_liquidity_input.min_amounts_out_raw
        assert balances_scaled18 == pool["balancesLiveScaled18"]

        return BeforeRemoveLiquidityResult(
            success=True,
            hook_adjusted_balances_scaled18=hook_state.balance_change,
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
    "balancesLiveScaled18": [2000000000000000000, 2000000000000000000],
    "tokenRates": [1000000000000000000, 1000000000000000000],
    "totalSupply": 1000000000000000000,
    "aggregateSwapFee": 500000000000000000,
    "randoms": [1, 2],
}

vault = Vault(
    custom_pool_classes={"CustomPool": CustomPool},
    custom_hook_classes={"CustomHook": CustomHook},
)


def test_hook_before_remove_liquidity():
    # should alter pool balances
    # hook state is used to pass new balances which give expected result
    input_hook_state = SimpleNamespace(
        balance_change=[1000000000000000000, 1000000000000000000]
    )

    custom_pool_state = map_custom_pool_state(pool)
    test = vault.remove_liquidity(
        remove_liquidity_input=remove_liquidity_input,
        pool_state=custom_pool_state,
        hook_state=input_hook_state,
    )
    assert test.bpt_amount_in_raw == remove_liquidity_input.max_bpt_amount_in_raw
    assert test.amounts_out_raw == [
        0,
        909999999999999999,
    ]

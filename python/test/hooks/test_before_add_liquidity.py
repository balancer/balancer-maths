import os
import sys
from types import SimpleNamespace
from typing import Protocol, TypeGuard

from src.common.types import AddLiquidityInput, AddLiquidityKind
from src.hooks.default_hook import DefaultHook
from src.hooks.types import BeforeAddLiquidityResult, HookState
from src.pools.weighted.weighted_data import map_weighted_state
from src.vault.vault import Vault

# Get the directory of the current file
current_file_dir = os.path.dirname(os.path.abspath(__file__))
# Get the parent directory (one level up)
parent_dir = os.path.dirname(os.path.dirname(current_file_dir))

# Insert the parent directory at the start of sys.path
sys.path.insert(0, parent_dir)


class HasBalanceChange(Protocol):
    balance_change: list


def has_balance_change(obj: object) -> TypeGuard[HasBalanceChange]:
    """Type guard to check if an object has a balance_change attribute."""
    return hasattr(obj, "balance_change")


class CustomHook(DefaultHook):
    def __init__(self):
        super().__init__()
        self.should_call_before_add_liquidity = True
        self.enable_hook_adjusted_amounts = False

    def on_before_add_liquidity(
        self,
        kind: AddLiquidityKind,
        max_amounts_in_scaled18: list[int],
        min_bpt_amount_out: int,
        balances_scaled18: list[int],
        hook_state: HookState | object,
    ) -> BeforeAddLiquidityResult:
        if not has_balance_change(hook_state):
            raise ValueError("Unexpected hookState")
        assert kind == add_liquidity_input.kind
        assert max_amounts_in_scaled18 == add_liquidity_input.max_amounts_in_raw
        assert min_bpt_amount_out == add_liquidity_input.min_bpt_amount_out_raw
        assert balances_scaled18 == pool["balancesLiveScaled18"]

        return BeforeAddLiquidityResult(
            success=True,
            hook_adjusted_balances_scaled18=hook_state.balance_change,
        )


add_liquidity_input = AddLiquidityInput(
    pool="0xb2456a6f51530053bc41b0ee700fe6a2c37282e8",
    max_amounts_in_raw=[200000000000000000, 100000000000000000],
    min_bpt_amount_out_raw=0,
    kind=AddLiquidityKind.UNBALANCED,
)

pool = {
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
    "aggregateSwapFee": 0,
    "randoms": [1000000000000000000, 1000000000000000000],
}

vault = Vault(
    custom_hook_classes={"CustomHook": CustomHook},
)


def test_hook_before_add_liquidity_no_fee():
    # should alter pool balances
    # hook state is used to pass new balances which give expected bptAmount out
    input_hook_state = SimpleNamespace(
        balance_change=[1000000000000000000, 1000000000000000000]
    )
    weighted_state = map_weighted_state(pool)
    test = vault.add_liquidity(
        add_liquidity_input=add_liquidity_input,
        pool_state=weighted_state,
        hook_state=input_hook_state,
    )
    # Hook adds 1n to amountsIn
    assert test.amounts_in_raw == [
        200000000000000000,
        100000000000000000,
    ]
    assert test.bpt_amount_out_raw == 146464294351867896

import os
import sys
from types import SimpleNamespace
from typing import Protocol, TypeGuard

from src.common.types import AddLiquidityInput, AddLiquidityKind
from src.hooks.default_hook import DefaultHook
from src.hooks.types import AfterAddLiquidityResult, HookState
from src.pools.weighted.weighted_data import map_weighted_state
from src.vault.vault import Vault

# Get the directory of the current file
current_file_dir = os.path.dirname(os.path.abspath(__file__))
# Get the parent directory (one level up)
parent_dir = os.path.dirname(os.path.dirname(current_file_dir))

# Insert the parent directory at the start of sys.path
sys.path.insert(0, parent_dir)


class HasExpectedBalancesLiveScaled18(Protocol):
    expected_balances_live_scaled18: list


def has_expected_balances_live_scaled18(
    obj: object,
) -> TypeGuard[HasExpectedBalancesLiveScaled18]:
    """Type guard to check if an object has a expected_balances_live_scaled18 attribute."""
    return hasattr(obj, "expected_balances_live_scaled18")


class CustomHook(DefaultHook):
    def __init__(self):
        super().__init__()
        self.should_call_after_add_liquidity = True
        self.enable_hook_adjusted_amounts = True

    def on_after_add_liquidity(
        self,
        kind: AddLiquidityKind,
        amounts_in_scaled18: list[int],
        amounts_in_raw: list[int],
        bpt_amount_out: int,
        balances_scaled18: list[int],
        hook_state: HookState | object,
    ) -> AfterAddLiquidityResult:
        if not has_expected_balances_live_scaled18(hook_state):
            raise ValueError("Unexpected hookState")
        assert kind == add_liquidity_input.kind
        assert bpt_amount_out == 146464294351867896
        assert amounts_in_scaled18 == add_liquidity_input.max_amounts_in_raw
        assert amounts_in_raw == add_liquidity_input.max_amounts_in_raw
        assert balances_scaled18 == hook_state.expected_balances_live_scaled18
        return AfterAddLiquidityResult(
            success=True,
            hook_adjusted_amounts_in_raw=[
                amounts_in_raw[0] + 1,
                amounts_in_raw[1] + 1,
            ],
        )


add_liquidity_input = AddLiquidityInput(
    pool="0xb2456a6f51530053bc41b0ee700fe6a2c37282e8",
    max_amounts_in_raw=[200000000000000000, 100000000000000000],
    min_bpt_amount_out_raw=0,
    kind=AddLiquidityKind.UNBALANCED,
)

pool = {
    "poolType": "WEIGHTED",
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
}

vault = Vault(
    custom_hook_classes={"CustomHook": CustomHook},
)


def test_hook_after_add_liquidity_no_fee():
    # aggregateSwapFee of 0 should not take any protocol fees from updated balances
    # hook state is used to pass expected value to tests
    input_hook_state = SimpleNamespace(
        expected_balances_live_scaled18=[
            1200000000000000000,
            1100000000000000000,
        ]
    )
    weighted_state_no_fee = map_weighted_state({**pool, "aggregateSwapFee": 0})
    test = vault.add_liquidity(
        add_liquidity_input=add_liquidity_input,
        pool_state=weighted_state_no_fee,
        hook_state=input_hook_state,
    )
    # Hook adds 1n to amountsIn
    assert test.amounts_in_raw == [
        200000000000000001,
        100000000000000001,
    ]
    assert test.bpt_amount_out_raw == 146464294351867896


def test_hook_after_add_liquidity_with_fee():
    # aggregateSwapFee of 50% should take half of remaining
    # hook state is used to pass expected value to tests
    # aggregate fee amount is 2554373534622012 which is deducted from amount in
    input_hook_state = SimpleNamespace(
        expected_balances_live_scaled18=[
            1200000000000000000 - 2554373534622012,
            1100000000000000000,
        ]
    )
    weighted_state_with_fee = map_weighted_state(
        {**pool, "aggregateSwapFee": 500000000000000000}
    )
    test = vault.add_liquidity(
        add_liquidity_input=add_liquidity_input,
        pool_state=weighted_state_with_fee,
        hook_state=input_hook_state,
    )
    # Hook adds 1n to amountsIn
    assert test.amounts_in_raw == [
        200000000000000001,
        100000000000000001,
    ]
    assert test.bpt_amount_out_raw == 146464294351867896

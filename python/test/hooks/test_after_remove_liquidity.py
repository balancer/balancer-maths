import os
import sys
from test.test_custom_pool import CustomPoolState, map_custom_pool_state
from types import SimpleNamespace
from typing import Protocol, TypeGuard

from src.common.maths import Rounding
from src.common.pool_base import PoolBase
from src.common.types import RemoveLiquidityInput, RemoveLiquidityKind
from src.hooks.default_hook import DefaultHook
from src.hooks.types import AfterRemoveLiquidityResult, HookState
from src.vault.vault import Vault

# Get the directory of the current file
current_file_dir = os.path.dirname(os.path.abspath(__file__))
# Get the parent directory (one level up)
parent_dir = os.path.dirname(os.path.dirname(current_file_dir))

# Insert the parent directory at the start of sys.path
sys.path.insert(0, parent_dir)


class CustomPool(PoolBase):
    def __init__(self, pool_state: CustomPoolState):
        self.pool_state = pool_state

    def get_maximum_invariant_ratio(self) -> int:
        return 1

    def get_minimum_invariant_ratio(self) -> int:
        return 1

    def on_swap(self, swap_params):
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
    ):
        return 1


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
        self.should_call_after_remove_liquidity = True
        self.enable_hook_adjusted_amounts = True

    def on_after_remove_liquidity(
        self,
        kind: RemoveLiquidityKind,
        bpt_amount_in: int,
        amounts_out_scaled18: list[int],
        amounts_out_raw: list[int],
        balances_scaled18: list[int],
        hook_state: HookState | object,
    ) -> AfterRemoveLiquidityResult:
        if not has_expected_balances_live_scaled18(hook_state):
            raise ValueError("Unexpected hookState")
        assert kind == remove_liquidity_input.kind
        assert bpt_amount_in == remove_liquidity_input.max_bpt_amount_in_raw
        assert amounts_out_scaled18 == [0, 909999999999999999]
        assert amounts_out_raw == [0, 909999999999999999]
        assert balances_scaled18 == hook_state.expected_balances_live_scaled18
        return AfterRemoveLiquidityResult(
            success=True,
            hook_adjusted_amounts_out_raw=[0] * len(amounts_out_scaled18),
        )


remove_liquidity_input = RemoveLiquidityInput(
    pool="0xb2456a6f51530053bc41b0ee700fe6a2c37282e8",
    min_amounts_out_raw=[0, 1],
    max_bpt_amount_in_raw=100000000000000000,
    kind=RemoveLiquidityKind.SINGLE_TOKEN_EXACT_IN,
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
    "randoms": [7000000000000000000, 8000000000000000000],
}

vault = Vault(
    custom_pool_classes={"CustomPool": CustomPool},
    custom_hook_classes={"CustomHook": CustomHook},
)


def test_hook_after_remove_liquidity_no_fee():
    # aggregateSwapFee of 0 should not take any protocol fees from updated balances
    # hook state is used to pass expected value to tests
    # Original balance is 1
    # Amount out is 0.9099...
    # Leaves 0.090000000000000001
    # Swap fee amount is: 0.09 which is all left in pool because aggregateFee is 0
    input_hook_state = SimpleNamespace(
        expected_balances_live_scaled18=[
            1000000000000000000,
            90000000000000001,
        ]
    )
    custom_state_no_fee = map_custom_pool_state({**pool, "aggregateSwapFee": 0})
    test = vault.remove_liquidity(
        remove_liquidity_input=remove_liquidity_input,
        pool_state=custom_state_no_fee,
        hook_state=input_hook_state,
    )
    assert test.amounts_out_raw == [
        0,
        0,
    ]
    assert test.bpt_amount_in_raw == remove_liquidity_input.max_bpt_amount_in_raw


def test_hook_after_remove_liquidity_with_fee():
    # aggregateSwapFee of 50% should take half of remaining
    # hook state is used to pass expected value to tests
    # Original balance is 1
    # Amount out is 0.9099...
    # Leaves 0.090000000000000001
    # Swap fee amount is: 0.09
    # Aggregate fee amount is 50% of swap fee: 0.045
    # Leaves 0.045000000000000001 in pool
    input_hook_state = SimpleNamespace(
        expected_balances_live_scaled18=[
            1000000000000000000,
            45000000000000001,
        ]
    )
    custom_state_with_fee = map_custom_pool_state(
        {**pool, "aggregateSwapFee": 500000000000000000}
    )
    test = vault.remove_liquidity(
        remove_liquidity_input=remove_liquidity_input,
        pool_state=custom_state_with_fee,
        hook_state=input_hook_state,
    )
    assert test.amounts_out_raw == [
        0,
        0,
    ]
    assert test.bpt_amount_in_raw == remove_liquidity_input.max_bpt_amount_in_raw

import os
import sys
from test.test_custom_pool import CustomPoolState, map_custom_pool_state
from types import SimpleNamespace
from typing import Protocol, TypeGuard

from src.common.maths import Rounding
from src.common.pool_base import PoolBase
from src.common.swap_params import SwapParams
from src.common.types import SwapInput, SwapKind
from src.hooks.default_hook import DefaultHook
from src.hooks.types import AfterSwapParams, AfterSwapResult, HookState
from src.vault.vault import Vault

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
    "randoms": [7000000000000000000, 8000000000000000000],
}


swap_input = SwapInput(
    amount_raw=1000000000000000000,
    swap_kind=SwapKind.GIVENIN,
    token_in=pool["tokens"][0],  # type: ignore
    token_out=pool["tokens"][1],  # type: ignore
)

EXPECTED_CALCULATED = 100000000000


class CustomPool(PoolBase):
    def __init__(self, pool_state: CustomPoolState):
        self.pool_state = pool_state

    def on_swap(self, swap_params: SwapParams) -> int:
        return 100000000000

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

    def get_maximum_invariant_ratio(self) -> int:
        return 1

    def get_minimum_invariant_ratio(self) -> int:
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
        self.should_call_after_swap = True
        self.enable_hook_adjusted_amounts = True

    def on_after_swap(
        self,
        after_swap_params: AfterSwapParams,
        hook_state: HookState | object,
    ) -> AfterSwapResult:
        token_in_balance_scaled18 = after_swap_params.token_in_balance_scaled18
        token_out_balance_scaled18 = after_swap_params.token_out_balance_scaled18
        if not has_expected_balances_live_scaled18(hook_state):
            raise ValueError("Unexpected hookState")
        assert after_swap_params.kind == swap_input.swap_kind

        assert after_swap_params.token_in == swap_input.token_in
        assert after_swap_params.token_out == swap_input.token_out
        assert after_swap_params.amount_in_scaled18 == swap_input.amount_raw
        assert after_swap_params.amount_calculated_raw == EXPECTED_CALCULATED
        assert after_swap_params.amount_calculated_scaled18 == EXPECTED_CALCULATED
        assert after_swap_params.amount_out_scaled18 == EXPECTED_CALCULATED
        assert [
            token_in_balance_scaled18,
            token_out_balance_scaled18,
        ] == hook_state.expected_balances_live_scaled18  # type: ignore
        return AfterSwapResult(success=True, hook_adjusted_amount_calculated_raw=1)


vault = Vault(
    custom_pool_classes={"CustomPool": CustomPool},
    custom_hook_classes={"CustomHook": CustomHook},
)


def test_hook_after_swap_no_fee():
    # aggregateSwapFee of 0 should not take any protocol fees from updated balances
    # hook state is used to pass expected value to tests
    # with aggregateFee = 0, balance out is just balance - calculated
    input_hook_state = SimpleNamespace(
        expected_balances_live_scaled18=[
            pool["balancesLiveScaled18"][0] + swap_input.amount_raw,  # type: ignore
            pool["balancesLiveScaled18"][1] - EXPECTED_CALCULATED,  # type: ignore
        ]
    )
    custom_state_no_fee = map_custom_pool_state({**pool, "aggregateSwapFee": 0})
    test = vault.swap(
        swap_input=swap_input,
        pool_state=custom_state_no_fee,
        hook_state=input_hook_state,
    )
    assert test == 1


def test_hook_after_swap_with_fee():
    # aggregateSwapFee of 50% should take half of remaining
    # hook state is used to pass expected value to tests
    # Aggregate fee amount is 50% of swap fee
    expected_aggregate_swap_fee_amount = 50000000000000000
    input_hook_state = SimpleNamespace(
        expected_balances_live_scaled18=[
            pool["balancesLiveScaled18"][0]  # type: ignore
            + swap_input.amount_raw
            - expected_aggregate_swap_fee_amount,
            pool["balancesLiveScaled18"][1] - EXPECTED_CALCULATED,  # type: ignore
        ]
    )
    custom_state_with_fee = map_custom_pool_state(
        {**pool, "aggregateSwapFee": 500000000000000000}
    )
    test = vault.swap(
        swap_input=swap_input,
        pool_state=custom_state_with_fee,
        hook_state=input_hook_state,
    )
    assert test == 1

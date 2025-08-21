import os
import sys
from types import SimpleNamespace
from typing import Protocol, TypeGuard

from src.common.swap_params import SwapParams
from src.common.types import SwapInput, SwapKind
from src.hooks.default_hook import DefaultHook
from src.hooks.types import BeforeSwapResult, HookState
from src.pools.weighted.weighted_data import map_weighted_state
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
    "balancesLiveScaled18": [2000000000000000000, 2000000000000000000],
    "tokenRates": [1000000000000000000, 1000000000000000000],
    "totalSupply": 1000000000000000000,
    "aggregateSwapFee": 500000000000000000,
}


swap_input = SwapInput(
    amount_raw=100000000,
    swap_kind=SwapKind.GIVENIN,
    token_in=pool["tokens"][0],  # type: ignore
    token_out=pool["tokens"][1],  # type: ignore
)


class HasBalanceChange(Protocol):
    balance_change: list


def has_balance_change(obj: object) -> TypeGuard[HasBalanceChange]:
    """Type guard to check if an object has a balance_change attribute."""
    return hasattr(obj, "balance_change")


class CustomHook(DefaultHook):
    def __init__(self):
        super().__init__()
        self.should_call_before_swap = True

    def on_before_swap(self, swap_params: SwapParams, hook_state: HookState | object):
        if not has_balance_change(hook_state):
            raise ValueError("hook_state must have a balance_change attribute")

        # Now the type checker knows hook_state has balance_change
        balance_change = hook_state.balance_change  # type: ignore
        assert swap_params.swap_kind == swap_input.swap_kind
        assert swap_params.index_in == 0
        assert swap_params.index_out == 1
        return BeforeSwapResult(
            success=True,
            hook_adjusted_balances_scaled18=balance_change,
        )


vault = Vault(
    custom_hook_classes={"CustomHook": CustomHook},
)


def test_before_swap():
    # should alter pool balances
    # hook state is used to pass new balances which give expected swap result
    input_hook_state = SimpleNamespace(
        balance_change=[1000000000000000000, 1000000000000000000]
    )
    weighted_state = map_weighted_state(pool)
    test = vault.swap(
        swap_input=swap_input,
        pool_state=weighted_state,
        hook_state=input_hook_state,
    )
    assert test == 89999999

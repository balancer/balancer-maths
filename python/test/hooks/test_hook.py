import os
import sys
from test.test_custom_pool import CustomPool, map_custom_pool_state

import pytest  # type: ignore

from src.common.types import SwapInput, SwapKind
from src.hooks.default_hook import DefaultHook
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
    "scalingFactors": [1000000000000000000, 1000000000000000000],
    "weights": [500000000000000000, 500000000000000000],
    "swapFee": 0,
    "balancesLiveScaled18": [64604926441576011, 46686842105263157924],
    "tokenRates": [1000000000000000000, 1000000000000000000],
    "totalSupply": 1736721048412749353,
    "randoms": [77, 88],
    "aggregateSwapFee": 0,
}


def test_hook_no_state():
    vault = Vault(
        custom_pool_classes={"CustomPool": CustomPool},
        custom_hook_classes={"CustomHook": DefaultHook},
    )
    custom_pool_state = map_custom_pool_state(pool)
    with pytest.raises(SystemError, match=r"\('No state for Hook:', 'CustomHook'\)"):
        vault.swap(
            swap_input=SwapInput(
                amount_raw=1,
                token_in="0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9",
                token_out="0xb19382073c7A0aDdbb56Ac6AF1808Fa49e377B75",
                swap_kind=SwapKind.GIVENIN,
            ),
            pool_state=custom_pool_state,
        )


def test_unsupported_hook_type():
    vault = Vault(
        custom_pool_classes={"CustomPool": CustomPool},
        custom_hook_classes={"CustomHook": DefaultHook},
    )
    custom_pool_state = map_custom_pool_state({**pool, "hookType": "Unsupported"})
    with pytest.raises(
        SystemError, match=r"\('Unsupported Hook Type:', 'Unsupported'\)"
    ):
        vault.swap(
            swap_input=SwapInput(
                amount_raw=1,
                token_in="0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9",
                token_out="0xb19382073c7A0aDdbb56Ac6AF1808Fa49e377B75",
                swap_kind=SwapKind.GIVENIN,
            ),
            pool_state=custom_pool_state,
        )

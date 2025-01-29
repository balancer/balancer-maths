import pytest
import sys
import os

# Get the directory of the current file
current_file_dir = os.path.dirname(os.path.abspath(__file__))
# Get the parent directory (one level up)
parent_dir = os.path.dirname(os.path.dirname(current_file_dir))

# Insert the parent directory at the start of sys.path
sys.path.insert(0, parent_dir)

from src.pools.weighted import Weighted
from src.remove_liquidity import RemoveKind

# Get the directory of the current file
current_file_dir = os.path.dirname(os.path.abspath(__file__))
# Get the parent directory (one level up)
parent_dir = os.path.dirname(os.path.dirname(current_file_dir))

# Insert the parent directory at the start of sys.path
sys.path.insert(0, parent_dir)

from src.vault import Vault
from src.hooks.default_hook import DefaultHook

class CustomPool():
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

class CustomHook:
    def __init__(self):
        self.should_call_compute_dynamic_swap_fee = False
        self.should_call_before_swap = False
        self.should_call_after_swap = False
        self.should_call_before_add_liquidity = False
        self.should_call_after_add_liquidity = False
        self.should_call_before_remove_liquidity = False
        self.should_call_after_remove_liquidity = True
        self.enable_hook_adjusted_amounts = True

    def on_before_add_liquidity(self):
        return {'success': False, 'hook_adjusted_balances_scaled18': []}

    def on_after_add_liquidity(self, kind, amounts_in_scaled18, amounts_in_raw, bpt_amount_out, balances_scaled18, hook_state):
        return { 'success': False, 'hook_adjusted_amounts_in_raw': [] };

    def on_before_remove_liquidity(self):
        return {'success': False, 'hook_adjusted_balances_scaled18': []}

    def on_after_remove_liquidity(self, kind, bpt_amount_in, amounts_out_scaled18, amounts_out_raw, balances_scaled18, hook_state):
        if not (isinstance(hook_state, dict) and hook_state is not None and 'expectedBalancesLiveScaled18' in hook_state):
            raise ValueError('Unexpected hookState')
        assert kind == remove_liquidity_input['kind']
        assert bpt_amount_in == remove_liquidity_input['max_bpt_amount_in_raw']
        assert amounts_out_scaled18 == [0, 909999999999999999]
        assert amounts_out_raw == [0, 909999999999999999]
        assert balances_scaled18 == hook_state['expectedBalancesLiveScaled18']
        return {
            'success': True,
            'hook_adjusted_amounts_out_raw': [0] * len(amounts_out_scaled18)
        }

    def on_before_swap(self):
        return {'success': False, 'hook_adjusted_balances_scaled18': []}

    def on_after_swap(self):
        return {'success': False, 'hook_adjusted_amount_calculated_raw': 0}

    def on_compute_dynamic_swap_fee(self):
        return {'success': False, 'dynamic_swap_fee': 0}

remove_liquidity_input = {
    "pool": '0xb2456a6f51530053bc41b0ee700fe6a2c37282e8',
    "min_amounts_out_raw": [0, 1],
    "max_bpt_amount_in_raw": 100000000000000000,
    "kind": RemoveKind.SINGLE_TOKEN_EXACT_IN.value,
}

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

def test_hook_after_remove_liquidity_no_fee():
    # aggregateSwapFee of 0 should not take any protocol fees from updated balances
    # hook state is used to pass expected value to tests
    # Original balance is 1
    # Amount out is 0.9099...
    # Leaves 0.090000000000000001
    # Swap fee amount is: 0.09 which is all left in pool because aggregateFee is 0
    input_hook_state = {
            "expectedBalancesLiveScaled18": [
                1000000000000000000,
                90000000000000001,
            ],
        }
    test = vault.remove_liquidity(
        remove_liquidity_input,
        { **pool, "aggregateSwapFee": 0 },
        hook_state=input_hook_state
    )
    assert test["amounts_out_raw"] == [
            0,
            0,
        ]
    assert test["bpt_amount_in_raw"] == remove_liquidity_input["max_bpt_amount_in_raw"]


def test_hook_after_add_liquidity_with_fee():
    # aggregateSwapFee of 50% should take half of remaining
    # hook state is used to pass expected value to tests
    # Original balance is 1
    # Amount out is 0.9099...
    # Leaves 0.090000000000000001
    # Swap fee amount is: 0.09
    # Aggregate fee amount is 50% of swap fee: 0.045
    # Leaves 0.045000000000000001 in pool
    input_hook_state = {
            "expectedBalancesLiveScaled18": [
                1000000000000000000,
                45000000000000001,
            ],
        }
    test = vault.remove_liquidity(
        remove_liquidity_input,
        pool,
        hook_state=input_hook_state
    )
    assert test["amounts_out_raw"] == [
            0,
            0,
        ]
    assert test["bpt_amount_in_raw"] == remove_liquidity_input["max_bpt_amount_in_raw"]
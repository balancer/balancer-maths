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
from src.swap import SwapKind

# Get the directory of the current file
current_file_dir = os.path.dirname(os.path.abspath(__file__))
# Get the parent directory (one level up)
parent_dir = os.path.dirname(os.path.dirname(current_file_dir))

# Insert the parent directory at the start of sys.path
sys.path.insert(0, parent_dir)

from src.vault import Vault
from src.hooks.default_hook import DefaultHook

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
    "swapFee": 100000000000000000,
    "balancesLiveScaled18": [1000000000000000000, 1000000000000000000],
    "tokenRates": [1000000000000000000, 1000000000000000000],
    "totalSupply": 1000000000000000000,
    "aggregateSwapFee": 500000000000000000,
}


swap_input = {
    "amount_raw": 1,
    "swap_kind": SwapKind.GIVENIN.value,
    "token_in": pool['tokens'][0],
    "token_out": pool['tokens'][1],
}

class CustomPool():
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

class CustomHook:
    def __init__(self):
        self.should_call_compute_dynamic_swap_fee = False
        self.should_call_before_swap = False
        self.should_call_after_swap = True
        self.should_call_before_add_liquidity = False
        self.should_call_after_add_liquidity = False
        self.should_call_before_remove_liquidity = False
        self.should_call_after_remove_liquidity = False
        self.enable_hook_adjusted_amounts = True

    def on_before_add_liquidity(self):
        return {'success': False, 'hook_adjusted_balances_scaled18': []}

    def on_after_add_liquidity(self, kind, amounts_in_scaled18, amounts_in_raw, bpt_amount_out, balances_scaled18, hook_state):
        return { 'success': False, 'hook_adjusted_amounts_in_raw': [] };

    def on_before_remove_liquidity(self):
        return {'success': False, 'hook_adjusted_balances_scaled18': []}

    def on_after_remove_liquidity(self, kind, bpt_amount_in, amounts_out_scaled18, amounts_out_raw, balances_scaled18, hook_state):
        return {
            'success': False,
            'hook_adjusted_amounts_out_raw': []
        }

    def on_before_swap(self):
        return {'success': False, 'hook_adjusted_balances_scaled18': []}

    def on_after_swap(self, params):
        hook_state = params['hook_state']
        token_in_balanceScaled18 = params['token_in_balance_scaled18']
        token_out_balance_scaled18 = params['token_out_balance_scaled18']
        if not (isinstance(hook_state, dict) and hook_state is not None and 'expectedBalancesLiveScaled18' in hook_state):
            raise ValueError('Unexpected hookState')
        assert params['kind'] == swap_input['swap_kind']
        
        assert params['token_in'] == swap_input['token_in']
        assert params['token_out'] == swap_input['token_out']
        assert params['amount_in_scaled18'] == swap_input['amount_raw']
        assert params['amount_calculated_raw'] == 90000000000
        assert params['amount_calculated_scaled18'] == 90000000000
        assert params['amount_out_scaled18'] == 90000000000
        assert params['token_in_balance_scaled18'] == int(pool['balancesLiveScaled18'][0] + swap_input['amount_raw'])
        assert [token_in_balanceScaled18, token_out_balance_scaled18] == hook_state['expectedBalancesLiveScaled18']
        return {'success': True, 'hook_adjusted_amount_calculated_raw': 1}

    def on_compute_dynamic_swap_fee(self):
        return {'success': False, 'dynamic_swap_fee': 0}

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
                pool['balancesLiveScaled18'][0] + swap_input['amount_raw'],
                999999910000000000,
            ],
        }
    test = vault.swap(
        swap_input,
        { **pool, 'aggregateSwapFee': 0 },
        hook_state=input_hook_state
    )
    assert test == 1


def test_hook_after_swap_with_fee():
    # aggregateSwapFee of 50% should take half of remaining
    # hook state is used to pass expected value to tests
    # Aggregate fee amount is 50% of swap fee
    input_hook_state = {
            "expectedBalancesLiveScaled18": [
                pool['balancesLiveScaled18'][0] + swap_input['amount_raw'],
                999999905000000000,
            ],
        }
    test = vault.swap(
        swap_input,
        pool,
        hook_state=input_hook_state
    )
    assert test == 1
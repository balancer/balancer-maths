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

remove_liquidity_input = {
    "pool": '0x03722034317d8fb16845213bd3ce15439f9ce136',
    "min_amounts_out_raw": [1, 1],
    "max_bpt_amount_in_raw": 10000000000000,
    "kind": RemoveKind.PROPORTIONAL.value,
}

pool = {
    "poolType": "WEIGHTED",
    "hookType": "ExitFee",
    "chainId": "11155111",
    "blockNumber": "5955145",
    "poolAddress": "0x03722034317d8fb16845213bd3ce15439f9ce136",
    "tokens": [
        "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9",
        "0xb19382073c7A0aDdbb56Ac6AF1808Fa49e377B75",
    ],
    "scalingFactors": [1, 1],
    "weights": [500000000000000000, 500000000000000000],
    "swapFee": 100000000000000000,
    "balancesLiveScaled18": [5000000000000000, 5000000000000000000],
    "tokenRates": [1000000000000000000, 1000000000000000000],
    "totalSupply": 158113883008415798,
    "aggregateSwapFee": 0,
}

vault = Vault()

def test_hook_exit_fee_no_fee():
    input_hook_state = {
            'removeLiquidityHookFeePercentage': 0,
            'tokens': pool['tokens'],
        }
    test = vault.remove_liquidity(
        remove_liquidity_input,
        pool,
        hook_state=input_hook_state
    )
    assert test["amounts_out_raw"] == [
            316227766016,
            316227766016844
        ]
    
def test_hook_exit_fee_with_fee():
    # 5% fee
    input_hook_state = {
            'removeLiquidityHookFeePercentage': 50000000000000000,
            'tokens': pool['tokens'],
        }
    test = vault.remove_liquidity(
        remove_liquidity_input,
        pool,
        hook_state=input_hook_state
    )
    assert test["amounts_out_raw"] == [
            300416377716,
            300416377716002
        ]

import sys
import os

# Get the directory of the current file
current_file_dir = os.path.dirname(os.path.abspath(__file__))
# Get the parent directory (one level up)
parent_dir = os.path.dirname(current_file_dir)
# Insert the parent directory at the start of sys.path
sys.path.insert(0, parent_dir)

from src.vault import Vault


def test_custom_pool():
    pool = {
        "poolType": "CustomPool",
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
    vault = Vault(custom_pool_classes={"CustomPool": CustomPool})
    calculated_amount = vault.swap(
        {
            "amount_raw": 1,
            "token_in": "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9",
            "token_out": "0xb19382073c7A0aDdbb56Ac6AF1808Fa49e377B75",
            "swap_kind": 0,
        },
        pool,
    )
    assert calculated_amount == pool["randoms"][0]


class CustomPool:
    def __init__(self, pool_state: dict):
        self.randoms = pool_state["randoms"]

    def get_max_swap_amount(self) -> int:
        return 1

    def get_max_single_token_remove_amount(self) -> int:
        return 1

    def get_max_single_token_add_amount(self) -> int:
        return 1

    def on_swap(self, swap_params) -> int:
        return self.randoms[0]

    def compute_invariant(self) -> int:
        return 1

    def compute_balance(self) -> int:
        return 1

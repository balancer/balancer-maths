from test.utils.read_test_data import read_test_data
import sys
import os

# Get the directory of the current file
current_file_dir = os.path.dirname(os.path.abspath(__file__))
# Get the parent directory (one level up)
parent_dir = os.path.dirname(current_file_dir)
# Insert the parent directory at the start of sys.path
sys.path.insert(0, parent_dir)

from src.vault import Vault

test_data = read_test_data()


def test_swaps():
    vault = Vault()
    for swap_test in test_data["swaps"]:
        print(swap_test["test"])
        if swap_test["test"] not in test_data["pools"]:
            raise Exception("Pool not in test data: ", swap_test["test"])
        pool = test_data["pools"][swap_test["test"]]
        if pool["poolType"] == "Buffer": continue
        # note any amounts must be passed as ints not strings
        calculated_amount = vault.swap(
            {
                "amount_raw": int(swap_test["amountRaw"]),
                "token_in": swap_test["tokenIn"],
                "token_out": swap_test["tokenOut"],
                "swap_kind": swap_test["swapKind"],
            },
            map_pool(pool),
        )
        assert calculated_amount == int(swap_test["outputRaw"])


def map_pool(pool_with_strings):
    pool_with_ints = {}
    for key, value in pool_with_strings.items():
        if isinstance(value, list):
            # Convert each element in the list to an integer, handling exceptions
            int_list = []
            for item in value:
                try:
                    int_list.append(int(item))
                except ValueError:
                    int_list = value
                    break
            pool_with_ints[key] = int_list
        else:
            try:
                pool_with_ints[key] = int(value)
            except ValueError:
                pool_with_ints[key] = value
    return pool_with_ints

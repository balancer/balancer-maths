from utils.read_test_data import read_test_data
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
    for swapTest in test_data["swaps"]:
        if swapTest["test"] not in test_data["pools"]:
            raise Exception("Pool not in test data: ", swapTest["test"])
        pool = test_data["pools"][swapTest["test"]]
        # note any amounts must be passed as ints not strings
        calculatedAmount = vault.swap({ "amount_raw": int(swapTest["amountRaw"]), "token_in": swapTest["tokenIn"], "token_out": swapTest["tokenOut"], "swap_kind": swapTest["swapKind"] },  map_pool(pool))
        assert calculatedAmount == swapTest["outputRaw"]

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

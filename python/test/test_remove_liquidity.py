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


def test_remove_liquidity():
    vault = Vault()
    for remove_test in test_data["removes"]:
        print("Remove Liquidity Test: ", remove_test["test"])
        if remove_test["test"] not in test_data["pools"]:
            raise Exception("Pool not in test data: ", remove_test["test"])
        pool = test_data["pools"][remove_test["test"]]
        if pool["poolType"] == 'Buffer':
            raise ValueError('Buffer pools do not support addLiquidity')
        # note any amounts must be passed as ints not strings
        calculated_amount = vault.remove_liquidity(
            {
                "pool": pool["poolAddress"],
                "min_amounts_out_raw": list(map(int, remove_test["amountsOutRaw"])),
                "max_bpt_amount_in_raw": int(remove_test["bptInRaw"]),
                "kind": remove_test["kind"],
            },
            map_pool(pool),
        )
        assert calculated_amount["bpt_amount_in_raw"] == int(remove_test["bptInRaw"])
        assert calculated_amount["amounts_out_raw"] == list(map(int, remove_test["amountsOutRaw"]))


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

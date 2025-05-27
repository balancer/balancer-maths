from test.utils.read_test_data import read_test_data
import sys
import os

from src.vault import Vault
from src.common.types import SwapInput, SwapKind

# Get the directory of the current file
current_file_dir = os.path.dirname(os.path.abspath(__file__))
# Get the parent directory (one level up)
parent_dir = os.path.dirname(current_file_dir)
# Insert the parent directory at the start of sys.path
sys.path.insert(0, parent_dir)


test_data = read_test_data()


def test_swaps():
    vault = Vault()
    for swap_test in test_data["swaps"]:
        print(swap_test["test"])
        if swap_test["test"] not in test_data["pools"]:
            raise Exception("Pool not in test data: ", swap_test["test"])
        pool = test_data["pools"][swap_test["test"]]
        # note any amounts must be passed as ints not strings
        calculated_amount = vault.swap(
            SwapInput(
                amount_raw=int(swap_test["amountRaw"]),
                token_in=swap_test["tokenIn"],
                token_out=swap_test["tokenOut"],
                swap_kind=SwapKind(swap_test["swapKind"]),
            ),
            map_pool(pool),
        )
        if pool["poolType"] == "Buffer":
            assert are_big_ints_within_percent(
                calculated_amount, int(swap_test["outputRaw"]), 0.01
            )
        else:
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


def are_big_ints_within_percent(value1: int, value2: int, percent: float) -> bool:
    if percent < 0:
        raise ValueError("Percent must be non-negative")

    difference = value1 - value2 if value1 > value2 else value2 - value1
    print("Buffer Difference:", difference)

    # Convert percent to basis points (1% = 100 basis points) multiplied by 1e6
    # This maintains precision similar to the TypeScript version
    percent_factor = int(percent * 1e8)
    tolerance = (value2 * percent_factor) // int(1e10)

    return difference <= tolerance

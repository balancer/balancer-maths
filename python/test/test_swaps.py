from test.utils.map_pool_state import map_pool_state, transform_strings_to_ints
from test.utils.read_test_data import read_test_data

from src.common.types import SwapInput, SwapKind
from src.vault.vault import Vault

test_data = read_test_data()


def test_swaps():
    vault = Vault()
    for swap_test in test_data["swaps"]:
        print(swap_test["test"])
        if swap_test["test"] not in test_data["pools"]:
            raise ValueError(f"Pool not in test data: {swap_test['test']}")
        pool = test_data["pools"][swap_test["test"]]
        # note any amounts must be passed as ints not strings
        pool_with_ints = transform_strings_to_ints(pool)
        calculated_amount = vault.swap(
            swap_input=SwapInput(
                amount_raw=int(swap_test["amountRaw"]),
                token_in=swap_test["tokenIn"],
                token_out=swap_test["tokenOut"],
                swap_kind=SwapKind(swap_test["swapKind"]),
            ),
            pool_state=map_pool_state(pool_with_ints),
        )
        if pool["poolType"] == "Buffer":
            assert are_big_ints_within_percent(
                calculated_amount, int(swap_test["outputRaw"]), 0.01
            )
        else:
            assert calculated_amount == int(swap_test["outputRaw"])


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

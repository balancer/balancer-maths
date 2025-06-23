from test.utils.map_pool_state import map_pool_state, transform_strings_to_ints
from test.utils.read_test_data import read_test_data
import sys
import os
from typing import cast

from vault.vault import Vault
from src.common.types import AddLiquidityInput, AddLiquidityKind, PoolState

# Get the directory of the current file
current_file_dir = os.path.dirname(os.path.abspath(__file__))
# Get the parent directory (one level up)
parent_dir = os.path.dirname(current_file_dir)
# Insert the parent directory at the start of sys.path
sys.path.insert(0, parent_dir)


test_data = read_test_data()


def test_add_liquidity():
    vault = Vault()
    for add_test in test_data["adds"]:
        print("Add Liquidity Test: ", add_test["test"])
        if add_test["test"] not in test_data["pools"]:
            raise ValueError(f"Pool not in test data: {add_test['test']}")
        pool = test_data["pools"][add_test["test"]]
        if pool["poolType"] == "Buffer":
            raise ValueError("Buffer pools do not support addLiquidity")
        # note any amounts must be passed as ints not strings
        pool_with_ints = transform_strings_to_ints(pool)
        calculated_amount = vault.add_liquidity(
            add_liquidity_input=AddLiquidityInput(
                pool=pool["poolAddress"],
                max_amounts_in_raw=list(map(int, add_test["inputAmountsRaw"])),
                min_bpt_amount_out_raw=int(add_test["bptOutRaw"]),
                kind=AddLiquidityKind(add_test["kind"]),
            ),
            pool_state=cast(PoolState, map_pool_state(pool_with_ints)),
        )
        assert calculated_amount.bpt_amount_out_raw == int(add_test["bptOutRaw"])
        assert calculated_amount.amounts_in_raw == list(
            map(int, add_test["inputAmountsRaw"])
        )

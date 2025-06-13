from test.utils.map_pool_state import map_pool_state, transform_strings_to_ints
from test.utils.read_test_data import read_test_data
import os
import sys
from typing import cast

from vault.vault import Vault
from src.common.types import PoolState, RemoveLiquidityInput, RemoveLiquidityKind

# Get the directory of the current file
current_file_dir = os.path.dirname(os.path.abspath(__file__))
# Get the parent directory (one level up)
parent_dir = os.path.dirname(current_file_dir)
# Insert the parent directory at the start of sys.path
sys.path.insert(0, parent_dir)

test_data = read_test_data()


def test_remove_liquidity():
    vault = Vault()
    for remove_test in test_data["removes"]:
        print("Remove Liquidity Test: ", remove_test["test"])
        if remove_test["test"] not in test_data["pools"]:
            raise Exception("Pool not in test data: ", remove_test["test"])
        pool = test_data["pools"][remove_test["test"]]
        if pool["poolType"] == "Buffer":
            raise ValueError("Buffer pools do not support addLiquidity")
        # note any amounts must be passed as ints not strings
        pool_with_ints = transform_strings_to_ints(pool)
        calculated_amount = vault.remove_liquidity(
            remove_liquidity_input=RemoveLiquidityInput(
                pool=pool["poolAddress"],
                min_amounts_out_raw=list(map(int, remove_test["amountsOutRaw"])),
                max_bpt_amount_in_raw=int(remove_test["bptInRaw"]),
                kind=RemoveLiquidityKind(remove_test["kind"]),
            ),
            pool_state=cast(PoolState, map_pool_state(pool_with_ints)),
        )
        assert calculated_amount.bpt_amount_in_raw == int(remove_test["bptInRaw"])
        assert calculated_amount.amounts_out_raw == list(
            map(int, remove_test["amountsOutRaw"])
        )

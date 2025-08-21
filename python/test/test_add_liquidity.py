from test.utils.map_pool_state import map_pool_state, transform_strings_to_ints
from test.utils.read_test_data import read_test_data
from typing import cast

from src.common.types import AddLiquidityInput, AddLiquidityKind, PoolState
from src.vault.vault import Vault

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

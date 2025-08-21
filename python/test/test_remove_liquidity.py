from test.utils.map_pool_state import map_pool_state, transform_strings_to_ints
from test.utils.read_test_data import read_test_data
from typing import cast

from src.common.types import PoolState, RemoveLiquidityInput, RemoveLiquidityKind
from src.vault.vault import Vault

test_data = read_test_data()


def test_remove_liquidity():
    vault = Vault()
    for remove_test in test_data["removes"]:
        print("Remove Liquidity Test: ", remove_test["test"])
        if remove_test["test"] not in test_data["pools"]:
            raise ValueError(f"Pool not in test data: {remove_test['test']}")
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

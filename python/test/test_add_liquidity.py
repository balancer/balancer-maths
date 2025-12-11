from test.utils.map_pool_state import (
    map_pool_and_hook_state,
    transform_strings_to_ints,
)
from test.utils.read_test_data import read_test_data
from test.utils.validate_balances import validate_balances
from typing import cast

from src.common.base_pool_state import BasePoolState
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
        pool_state, hook_state = map_pool_and_hook_state(pool_with_ints)
        calculated_amount = vault.add_liquidity(
            add_liquidity_input=AddLiquidityInput(
                pool=pool["poolAddress"],
                max_amounts_in_raw=list(map(int, add_test["inputAmountsRaw"])),
                min_bpt_amount_out_raw=int(add_test["bptOutRaw"]),
                kind=AddLiquidityKind(add_test["kind"]),
            ),
            pool_state=cast(PoolState, pool_state),
            hook_state=hook_state,
        )
        # Relax test assertion to accept off-by-1 error because testData might
        # return amounts off-by-1 when compared to actual implementations.
        # e.g. getCurrentLiveBalances rounds pools balances down, while solidity
        # rounds pool balances up when loading pool data within add liquidity operations
        assert calculated_amount.bpt_amount_out_raw >= int(add_test["bptOutRaw"]) - 1
        assert calculated_amount.bpt_amount_out_raw <= int(add_test["bptOutRaw"]) + 1
        assert calculated_amount.amounts_in_raw == list(
            map(int, add_test["inputAmountsRaw"])
        )

        # Validate updated balances
        # Skip validation if hook has shouldCallComputeDynamicSwapFee enabled
        should_validate = True
        if isinstance(pool_state, BasePoolState):
            hook = vault._get_hook(hook_name=pool_state.hook_type, hook_state=hook_state)
            should_validate = not hook.should_call_compute_dynamic_swap_fee

        if should_validate:
            validate_balances(
                initial_pool_state=pool_state,
                updated_pool_state=calculated_amount.updated_pool_state,
                amount_deltas_raw=calculated_amount.amounts_in_raw,
            )

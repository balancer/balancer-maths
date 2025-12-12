from test.utils.map_pool_state import (
    map_pool_and_hook_state,
    transform_strings_to_ints,
)
from test.utils.read_test_data import read_test_data
from test.utils.validate_balances import (
    build_remove_liquidity_deltas,
    validate_balances,
)
from typing import cast

from src.common.base_pool_state import BasePoolState
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
        pool_state, hook_state = map_pool_and_hook_state(pool_with_ints)
        calculated_amount = vault.remove_liquidity(
            remove_liquidity_input=RemoveLiquidityInput(
                pool=pool["poolAddress"],
                min_amounts_out_raw=list(map(int, remove_test["amountsOutRaw"])),
                max_bpt_amount_in_raw=int(remove_test["bptInRaw"]),
                kind=RemoveLiquidityKind(remove_test["kind"]),
            ),
            pool_state=cast(PoolState, pool_state),
            hook_state=hook_state,
        )
        assert calculated_amount.bpt_amount_in_raw == int(remove_test["bptInRaw"])
        assert calculated_amount.amounts_out_raw == list(
            map(int, remove_test["amountsOutRaw"])
        )

        # Validate updated balances
        # Skip validation if hook has shouldCallComputeDynamicSwapFee enabled
        should_validate = True
        if isinstance(pool_state, BasePoolState):
            hook = vault._get_hook(
                hook_name=pool_state.hook_type, hook_state=hook_state
            )
            should_validate = not hook.should_call_compute_dynamic_swap_fee

        if should_validate:
            deltas = build_remove_liquidity_deltas(
                pool_state=pool_state,
                amounts_out_raw=calculated_amount.amounts_out_raw,
                swap_fee_amounts_scaled18=calculated_amount.swap_fee_amounts_scaled18,
            )
            if deltas is not None:
                validate_balances(
                    initial_pool_state=pool_state,
                    updated_pool_state=calculated_amount.updated_pool_state,
                    amount_deltas_raw=deltas,
                )

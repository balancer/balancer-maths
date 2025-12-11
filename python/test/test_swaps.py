from test.utils.map_pool_state import (
    map_pool_and_hook_state,
    transform_strings_to_ints,
)
from test.utils.read_test_data import read_test_data
from test.utils.validate_balances import build_swap_deltas, validate_balances

from src.common.base_pool_state import BasePoolState
from src.common.types import SwapInput, SwapKind
from src.vault.vault import Vault

test_data = read_test_data()


def test_swaps():
    vault = Vault()

    for swap_test in test_data["swaps"]:
        if swap_test["test"] == "1-23511249-GyroECLP-Barter.json":
            continue

        test_name = swap_test["test"]
        if test_name not in test_data["pools"]:
            raise ValueError(f"Pool not in test data: {test_name}")

        pool = test_data["pools"][test_name]
        pool_with_ints = transform_strings_to_ints(pool)
        pool_state, hook_state = map_pool_and_hook_state(pool_with_ints)

        swap_input = SwapInput(
            amount_raw=int(swap_test["amountRaw"]),
            token_in=swap_test["tokenIn"],
            token_out=swap_test["tokenOut"],
            swap_kind=SwapKind(swap_test["swapKind"]),
        )
        swap_result = vault.swap(
            swap_input=swap_input,
            pool_state=pool_state,
            hook_state=hook_state,
        )

        # Validate amount out
        if pool["poolType"] == "Buffer":
            assert are_big_ints_within_percent(
                swap_result.amount_calculated_raw, int(swap_test["outputRaw"]), 0.01
            )
        else:
            assert swap_result.amount_calculated_raw == int(swap_test["outputRaw"])

        # Validate updated balances
        # Skip validation if hook has shouldCallComputeDynamicSwapFee enabled
        should_validate = True
        if isinstance(pool_state, BasePoolState):
            hook = vault._get_hook(hook_name=pool_state.hook_type, hook_state=hook_state)
            should_validate = not hook.should_call_compute_dynamic_swap_fee

        if should_validate:
            amount_in_raw = (
                swap_input.amount_raw
                if swap_input.swap_kind.value == SwapKind.GIVENIN.value
                else swap_result.amount_calculated_raw
            )
            amount_out_raw = (
                swap_input.amount_raw
                if swap_input.swap_kind.value == SwapKind.GIVENOUT.value
                else swap_result.amount_calculated_raw
            )
            deltas = build_swap_deltas(
                pool_state=pool_state,
                token_in=swap_input.token_in,
                token_out=swap_input.token_out,
                amount_in_raw=amount_in_raw,
                amount_out_raw=amount_out_raw,
            )
            if deltas is not None:
                validate_balances(
                    initial_pool_state=pool_state,
                    updated_pool_state=swap_result.updated_pool_state,
                    amount_deltas_raw=deltas,
                )


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

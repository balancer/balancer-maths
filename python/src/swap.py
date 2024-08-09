from enum import Enum
from src.utils import (
    find_case_insensitive_index_in_list,
    _to_scaled_18_apply_rate_round_down,
    _to_scaled_18_apply_rate_round_up,
)


class SwapKind(Enum):
    GIVENIN = 1
    GIVENOUT = 2


def swap(swap_input, pool_state, pool_class, hook_class, hook_state):

    input_index = find_case_insensitive_index_in_list(
        pool_state["tokens"], swap_input["token_in"]
    )
    if input_index == -1:
        raise SystemError("Input token not found on pool")

    output_index = find_case_insensitive_index_in_list(
        pool_state["tokens"], swap_input["token_out"]
    )
    if input_index == -1:
        raise SystemError("Output token not found on pool")

    amount_given_scaled18 = _update_amount_given_in_vars(
        swap_input["amount_raw"],
        swap_input["swap_kind"],
        input_index,
        output_index,
        pool_state["scalingFactors"],
        pool_state["tokenRates"],
    )

    updated_balances_live_scaled18 = pool_state["balancesLiveScaled18"][:]
    if hook_class.shouldCallBeforeSwap:
        # Note - in SC balances and amounts are updated to reflect any rate change.
        # Daniel said we should not worry about this as any large rate changes will mean something has gone wrong.
        # We do take into account and balance changes due to hook using hookAdjustedBalancesScaled18.
        hook_return = hook_class.onBeforeSwap({**swap_input, "hook_state": hook_state})
        if hook_return["success"] is False:
            raise SystemError("BeforeSwapHookFailed")
        for i, a in enumerate(hook_return["hookAdjustedBalancesScaled18"]):
            updated_balances_live_scaled18[i] = a

    return pool_class.on_swap(1)


def _update_amount_given_in_vars(
    amount_given_raw: int,
    swap_kind: SwapKind,
    index_in: int,
    index_out: int,
    scaling_factors: list[int],
    token_rates: list[int],
) -> int:
    # If the amountGiven is entering the pool math (ExactIn), round down
    # since a lower apparent amountIn leads
    # to a lower calculated amountOut, favoring the pool.
    if swap_kind == SwapKind.GIVENIN:
        amount_given_scaled_18 = _to_scaled_18_apply_rate_round_down(
            amount_given_raw,
            scaling_factors[index_in],
            token_rates[index_in],
        )
    else:
        amount_given_scaled_18 = _to_scaled_18_apply_rate_round_up(
            amount_given_raw,
            scaling_factors[index_out],
            token_rates[index_out],
        )

    return amount_given_scaled_18

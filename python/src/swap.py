from enum import Enum
from src.utils import (
    find_case_insensitive_index_in_list,
    _to_scaled_18_apply_rate_round_down,
    _to_scaled_18_apply_rate_round_up,
    _to_raw_undo_rate_round_down,
    _to_raw_undo_rate_round_up,
    _compute_and_charge_aggregate_swap_fees,
)
from src.maths import mul_up_fixed


class SwapKind(Enum):
    GIVENIN = 0
    GIVENOUT = 1


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
        # Daniel said we should not worry about this as any large rate changes
        # will mean something has gone wrong.
        # We do take into account and balance changes due
        # to hook using hookAdjustedBalancesScaled18.
        hook_return = hook_class.onBeforeSwap({**swap_input, "hook_state": hook_state})
        if hook_return["success"] is False:
            raise SystemError("BeforeSwapHookFailed")
        for i, a in enumerate(hook_return["hookAdjustedBalancesScaled18"]):
            updated_balances_live_scaled18[i] = a

    swap_fee = pool_state["swapFee"]
    if hook_class.shouldCallComputeDynamicSwapFee:
        hook_return = hook_class.onComputeDynamicSwapFee(
            swap_input,
            pool_state["swapFee"],
            hook_state,
        )
        if hook_return["success"] is True:
            swap_fee = hook_return["dynamicSwapFee"]

    # _swap()
    swap_params = {
        "swap_kind": swap_input["swap_kind"],
        "amount_given_scaled18": amount_given_scaled18,
        "balances_live_scaled18": updated_balances_live_scaled18,
        "index_in": input_index,
        "index_out": output_index,
    }

    amount_calculated_scaled18 = pool_class.on_swap(swap_params)

    # Set swap_fee_amount_scaled18 based on the amountCalculated.
    swap_fee_amount_scaled18 = 0
    if swap_fee > 0:
        # Swap fee is always a percentage of the amountCalculated.
        # On ExactIn, subtract it from the calculated
        # amountOut. On ExactOut, add it to the calculated amountIn.
        # Round up to avoid losses during precision loss.
        swap_fee_amount_scaled18 = mul_up_fixed(amount_calculated_scaled18, swap_fee)

    amount_calculated_raw = 0
    if swap_input["swap_kind"] == SwapKind.GIVENIN.value:
        amount_calculated_scaled18 -= swap_fee_amount_scaled18
        # For `ExactIn` the amount calculated is leaving the Vault, so we round down.
        amount_calculated_raw = _to_raw_undo_rate_round_down(
            amount_calculated_scaled18,
            pool_state["scalingFactors"][output_index],
            pool_state["tokenRates"][output_index],
        )
    else:
        amount_calculated_scaled18 += swap_fee_amount_scaled18
        # For `ExactOut` the amount calculated is entering the Vault, so we round up.
        amount_calculated_raw = _to_raw_undo_rate_round_up(
            amount_calculated_scaled18,
            pool_state["scalingFactors"][input_index],
            pool_state["tokenRates"][input_index],
        )

    aggregate_swap_fee_amount_scaled18 = _compute_and_charge_aggregate_swap_fees(
        swap_fee_amount_scaled18,
        pool_state["aggregateSwapFee"],
    )

    # For ExactIn, we increase the tokenIn balance by `amountIn`,
    # and decrease the tokenOut balance by the
    # (`amountOut` + fees).
    # For ExactOut, we increase the tokenInBalance by (`amountIn` - fees),
    # and decrease the tokenOut balance by
    # `amountOut`.
    balance_in_increment, balance_out_decrement = (
        (
            amount_given_scaled18,
            amount_calculated_scaled18 + aggregate_swap_fee_amount_scaled18,
        )
        if swap_input["swap_kind"] == SwapKind.GIVENIN
        else (
            amount_calculated_scaled18 - aggregate_swap_fee_amount_scaled18,
            amount_given_scaled18,
        )
    )

    updated_balances_live_scaled18[input_index] += balance_in_increment
    updated_balances_live_scaled18[output_index] -= balance_out_decrement

    if hook_class.shouldCallAfterSwap:
        hook_return = hook_class.onAfterSwap(
            {
                "kind": swap_input["swap_kind"],
                "token_in": swap_input["token_in"],
                "token_out": swap_input["token_out"],
                "amount_in_scaled18": (
                    amount_given_scaled18
                    if swap_input["swap_kind"] == SwapKind.GIVENIN
                    else amount_calculated_scaled18
                ),
                "amount_out_scaled18": (
                    amount_calculated_scaled18
                    if swap_input["swap_kind"] == SwapKind.GIVENIN
                    else amount_given_scaled18
                ),
                "token_in_balance_scaled18": updated_balances_live_scaled18[
                    input_index
                ],
                "token_out_balance_scaled18": updated_balances_live_scaled18[
                    output_index
                ],
                "amount_calculated_scaled18": amount_calculated_scaled18,
                "amount_calculated_raw": amount_calculated_raw,
                "hook_state": hook_state,
            }
        )
        if hook_return["success"] is False:
            raise SystemError(
                "AfterAddSwapHookFailed", pool_state["poolType"], pool_state["hookType"]
            )
        # If hook adjusted amounts is not enabled, ignore amount returned by the hook
        if hook_class.enable_hook_adjusted_amounts:
            amount_calculated_raw = hook_return["hook_adjusted_amount_calculated_raw"]

    return amount_calculated_raw


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
    if swap_kind == SwapKind.GIVENIN.value:
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

from enum import Enum
from src.utils import (
    find_case_insensitive_index_in_list,
    _to_scaled_18_apply_rate_round_down,
    _to_scaled_18_apply_rate_round_up,
    _to_raw_undo_rate_round_down,
    _to_raw_undo_rate_round_up,
    _compute_and_charge_aggregate_swap_fees,
)
from src.maths import mul_up_fixed, mul_div_up, complement_fixed, WAD

_MINIMUM_TRADE_AMOUNT = 1e6


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
    if output_index == -1:
        raise SystemError("Output token not found on pool")

    amount_given_scaled18 = _compute_amount_given_scaled18(
        swap_input["amount_raw"],
        swap_input["swap_kind"],
        input_index,
        output_index,
        pool_state["scalingFactors"],
        pool_state["tokenRates"],
    )

    updated_balances_live_scaled18 = pool_state["balancesLiveScaled18"][:]
    if hook_class.should_call_before_swap:
        # Note - in SC balances and amounts are updated to reflect any rate change.
        # Daniel said we should not worry about this as any large rate changes
        # will mean something has gone wrong.
        # We do take into account and balance changes due
        # to hook using hookAdjustedBalancesScaled18.
        hook_return = hook_class.on_before_swap(
            {**swap_input, "hook_state": hook_state}
        )
        if hook_return["success"] is False:
            raise SystemError("BeforeSwapHookFailed")
        for i, a in enumerate(hook_return["hook_adjusted_balances_scaled18"]):
            updated_balances_live_scaled18[i] = a

    # _swap()
    swap_params = {
        "swap_kind": swap_input["swap_kind"],
        "amount_given_scaled18": amount_given_scaled18,
        "balances_live_scaled18": updated_balances_live_scaled18,
        "index_in": input_index,
        "index_out": output_index,
    }

    swap_fee = pool_state["swapFee"]
    if hook_class.should_call_compute_dynamic_swap_fee:
        hook_return = hook_class.on_compute_dynamic_swap_fee(
            swap_params,
            pool_state["swapFee"],
            hook_state,
        )
        if hook_return["success"] is True:
            swap_fee = hook_return["dynamic_swap_fee"]

    total_swap_fee_amount_scaled18 = 0
    if swap_params["swap_kind"] == SwapKind.GIVENIN.value:
        # Round up to avoid losses during precision loss.
        total_swap_fee_amount_scaled18 = mul_up_fixed(
            swap_params["amount_given_scaled18"],
            swap_fee,
        )
        swap_params["amount_given_scaled18"] -= total_swap_fee_amount_scaled18

    _ensure_valid_swap_amount(swap_params["amount_given_scaled18"])

    amount_calculated_scaled18 = pool_class.on_swap(swap_params)

    _ensure_valid_swap_amount(amount_calculated_scaled18)

    amount_calculated_raw = 0
    if swap_input["swap_kind"] == SwapKind.GIVENIN.value:
        # For `ExactIn` the amount calculated is leaving the Vault, so we round down.
        amount_calculated_raw = _to_raw_undo_rate_round_down(
            amount_calculated_scaled18,
            pool_state["scalingFactors"][output_index],
            # // If the swap is ExactIn, the amountCalculated is the amount of tokenOut. So, we want to use the rate
            # // rounded up to calculate the amountCalculatedRaw, because scale down (undo rate) is a division, the
            # // larger the rate, the smaller the amountCalculatedRaw. So, any rounding imprecision will stay in the
            # // Vault and not be drained by the user.
            _compute_rate_round_up(pool_state["tokenRates"][output_index]),
        )
    else:
        # // To ensure symmetry with EXACT_IN, the swap fee used by ExactOut is
        # // `amountCalculated * fee% / (100% - fee%)`. Add it to the calculated amountIn. Round up to avoid losses
        # // during precision loss.
        total_swap_fee_amount_scaled18 = mul_div_up(
            amount_calculated_scaled18, swap_fee, complement_fixed(swap_fee)
        )
        amount_calculated_scaled18 += total_swap_fee_amount_scaled18

        # For `ExactOut` the amount calculated is entering the Vault, so we round up.
        amount_calculated_raw = _to_raw_undo_rate_round_up(
            amount_calculated_scaled18,
            pool_state["scalingFactors"][input_index],
            pool_state["tokenRates"][input_index],
        )

    aggregate_swap_fee_amount_scaled18 = _compute_and_charge_aggregate_swap_fees(
        total_swap_fee_amount_scaled18,
        pool_state["aggregateSwapFee"],
        pool_state["scalingFactors"],
        pool_state["tokenRates"],
        input_index,
    )

    # For ExactIn, we increase the tokenIn balance by `amountIn`,
    # and decrease the tokenOut balance by the
    # (`amountOut` + fees).
    # For ExactOut, we increase the tokenInBalance by (`amountIn` - fees),
    # and decrease the tokenOut balance by
    # `amountOut`.
    balance_in_increment, balance_out_decrement = (
        (
            amount_given_scaled18 - aggregate_swap_fee_amount_scaled18,
            amount_calculated_scaled18,
        )
        if swap_input["swap_kind"] == SwapKind.GIVENIN.value
        else (
            amount_calculated_scaled18 - aggregate_swap_fee_amount_scaled18,
            amount_given_scaled18,
        )
    )

    updated_balances_live_scaled18[input_index] += balance_in_increment
    updated_balances_live_scaled18[output_index] -= balance_out_decrement

    if hook_class.should_call_after_swap:
        hook_return = hook_class.on_after_swap(
            {
                "kind": swap_input["swap_kind"],
                "token_in": swap_input["token_in"],
                "token_out": swap_input["token_out"],
                "amount_in_scaled18": (
                    amount_given_scaled18
                    if swap_input["swap_kind"] == SwapKind.GIVENIN.value
                    else amount_calculated_scaled18
                ),
                "amount_out_scaled18": (
                    amount_calculated_scaled18
                    if swap_input["swap_kind"] == SwapKind.GIVENIN.value
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


def _compute_amount_given_scaled18(
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


# /**
# * @notice Rounds up a rate informed by a rate provider.
# * @dev Rates calculated by an external rate provider have rounding errors. Intuitively, a rate provider
# * rounds the rate down so the pool math is executed with conservative amounts. However, when upscaling or
# * downscaling the amount out, the rate should be rounded up to make sure the amounts scaled are conservative.
# */
def _compute_rate_round_up(rate: int) -> int:
    # // If rate is divisible by FixedPoint.ONE, roundedRate and rate will be equal. It means that rate has 18 zeros,
    # // so there's no rounding issue and the rate should not be rounded up.
    rounded_rate = (rate / WAD) * WAD
    return rate if rounded_rate == rate else rate + 1


# // Minimum token value in or out (applied to scaled18 values), enforced as a security measure to block potential
# // exploitation of rounding errors. This is called in the swap context, so zero is not a valid amount.
def _ensure_valid_swap_amount(trade_amount: int) -> bool:
    if trade_amount < _MINIMUM_TRADE_AMOUNT:
        raise SystemError("TradeAmountTooSmall")
    return True

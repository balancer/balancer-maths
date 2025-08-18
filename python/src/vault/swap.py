from src.common.constants import WAD
from src.common.maths import complement_fixed, mul_div_up_fixed, mul_up_fixed
from src.common.pool_base import PoolBase
from src.common.swap_params import SwapParams
from src.common.types import PoolState, SwapInput, SwapKind
from src.common.utils import (
    _compute_and_charge_aggregate_swap_fees,
    _to_raw_undo_rate_round_down,
    _to_raw_undo_rate_round_up,
    _to_scaled_18_apply_rate_round_down,
    _to_scaled_18_apply_rate_round_up,
    find_case_insensitive_index_in_list,
)
from src.hooks.types import AfterSwapParams, HookBase, HookState

_MINIMUM_TRADE_AMOUNT = 1e6


def swap(
    swap_input: SwapInput,
    pool_state: PoolState,
    pool_class: PoolBase,
    hook_class: HookBase,
    hook_state: HookState | object | None,
) -> int:
    input_index = find_case_insensitive_index_in_list(
        pool_state.tokens, swap_input.token_in
    )
    if input_index == -1:
        raise SystemError("Input token not found on pool")

    output_index = find_case_insensitive_index_in_list(
        pool_state.tokens, swap_input.token_out
    )
    if output_index == -1:
        raise SystemError("Output token not found on pool")

    amount_given_scaled18 = _compute_amount_given_scaled18(
        swap_input.amount_raw,
        swap_input.swap_kind,
        input_index,
        output_index,
        pool_state.scaling_factors,
        pool_state.token_rates,
    )

    updated_balances_live_scaled18 = pool_state.balances_live_scaled18[:]

    # _swap()
    swap_params = SwapParams(
        swap_kind=swap_input.swap_kind,
        amount_given_scaled18=amount_given_scaled18,
        balances_live_scaled18=updated_balances_live_scaled18,
        index_in=input_index,
        index_out=output_index,
    )

    if hook_class.should_call_before_swap:
        # Note - in SC balances and amounts are updated to reflect any rate change.
        # Daniel said we should not worry about this as any large rate changes
        # will mean something has gone wrong.
        # We do take into account and balance changes due
        # to hook using hookAdjustedBalancesScaled18.
        hook_return = hook_class.on_before_swap(
            swap_params,
            hook_state,
        )
        if hook_return.success is False:
            raise SystemError("BeforeSwapHookFailed")
        for i, a in enumerate(hook_return.hook_adjusted_balances_scaled18):
            updated_balances_live_scaled18[i] = a

    swap_fee = pool_state.swap_fee
    if hook_class.should_call_compute_dynamic_swap_fee:
        dynamic_fee_result = hook_class.on_compute_dynamic_swap_fee(
            swap_params,
            pool_state.swap_fee,
            hook_state,
        )
        if dynamic_fee_result.success is True:
            swap_fee = dynamic_fee_result.dynamic_swap_fee

    total_swap_fee_amount_scaled18 = 0
    if swap_params.swap_kind.value == SwapKind.GIVENIN.value:
        # Round up to avoid losses during precision loss.
        total_swap_fee_amount_scaled18 = mul_up_fixed(
            swap_params.amount_given_scaled18,
            swap_fee,
        )
        swap_params.amount_given_scaled18 -= total_swap_fee_amount_scaled18

    _ensure_valid_swap_amount(swap_params.amount_given_scaled18)

    amount_calculated_scaled18 = pool_class.on_swap(swap_params)

    _ensure_valid_swap_amount(amount_calculated_scaled18)

    amount_calculated_raw = 0
    if swap_input.swap_kind.value == SwapKind.GIVENIN.value:
        # For `ExactIn` the amount calculated is leaving the Vault, so we round down.
        amount_calculated_raw = _to_raw_undo_rate_round_down(
            amount_calculated_scaled18,
            pool_state.scaling_factors[output_index],
            # // If the swap is ExactIn, the amountCalculated is the amount of tokenOut. So, we want to use the rate
            # // rounded up to calculate the amountCalculatedRaw, because scale down (undo rate) is a division, the
            # // larger the rate, the smaller the amountCalculatedRaw. So, any rounding imprecision will stay in the
            # // Vault and not be drained by the user.
            _compute_rate_round_up(pool_state.token_rates[output_index]),
        )
    else:
        # // To ensure symmetry with EXACT_IN, the swap fee used by ExactOut is
        # // `amountCalculated * fee% / (100% - fee%)`. Add it to the calculated amountIn. Round up to avoid losses
        # // during precision loss.
        total_swap_fee_amount_scaled18 = mul_div_up_fixed(
            amount_calculated_scaled18, swap_fee, complement_fixed(swap_fee)
        )
        amount_calculated_scaled18 += total_swap_fee_amount_scaled18

        # For `ExactOut` the amount calculated is entering the Vault, so we round up.
        amount_calculated_raw = _to_raw_undo_rate_round_up(
            amount_calculated_scaled18,
            pool_state.scaling_factors[input_index],
            pool_state.token_rates[input_index],
        )

    aggregate_swap_fee_amount_scaled18 = _compute_and_charge_aggregate_swap_fees(
        total_swap_fee_amount_scaled18,
        pool_state.aggregate_swap_fee,
        pool_state.scaling_factors,
        pool_state.token_rates,
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
        if swap_input.swap_kind.value == SwapKind.GIVENIN.value
        else (
            amount_calculated_scaled18 - aggregate_swap_fee_amount_scaled18,
            amount_given_scaled18,
        )
    )

    updated_balances_live_scaled18[input_index] += balance_in_increment
    updated_balances_live_scaled18[output_index] -= balance_out_decrement

    if hook_class.should_call_after_swap:
        after_swap_result = hook_class.on_after_swap(
            AfterSwapParams(
                kind=swap_input.swap_kind,
                token_in=swap_input.token_in,
                token_out=swap_input.token_out,
                amount_in_scaled18=(
                    amount_given_scaled18
                    if swap_params.swap_kind.value == SwapKind.GIVENIN.value
                    else amount_calculated_scaled18
                ),
                amount_out_scaled18=(
                    amount_calculated_scaled18
                    if swap_params.swap_kind.value == SwapKind.GIVENIN.value
                    else amount_given_scaled18
                ),
                token_in_balance_scaled18=updated_balances_live_scaled18[input_index],
                token_out_balance_scaled18=updated_balances_live_scaled18[output_index],
                amount_calculated_scaled18=amount_calculated_scaled18,
                amount_calculated_raw=amount_calculated_raw,
            ),
            hook_state,
        )
        if after_swap_result.success is False:
            raise SystemError(
                "AfterAddSwapHookFailed", pool_state.pool_type, pool_state.hook_type
            )
        # If hook adjusted amounts is not enabled, ignore amount returned by the hook
        if hook_class.enable_hook_adjusted_amounts:
            amount_calculated_raw = (
                after_swap_result.hook_adjusted_amount_calculated_raw
            )

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
    if swap_kind.value == SwapKind.GIVENIN.value:
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

from src.common.base_pool_math import (
    compute_add_liquidity_single_token_exact_out,
    compute_add_liquidity_unbalanced,
)
from src.common.pool_base import PoolBase
from src.common.types import (
    AddLiquidityInput,
    AddLiquidityKind,
    AddLiquidityResult,
    PoolState,
)
from src.common.utils import (
    _compute_and_charge_aggregate_swap_fees,
    _copy_to_scaled18_apply_rate_round_down_array,
    _get_single_input_index,
    _require_unbalanced_liquidity_enabled,
    _to_raw_undo_rate_round_up,
)
from src.hooks.types import HookBase, HookState


def add_liquidity(
    add_liquidity_input: AddLiquidityInput,
    pool_state: PoolState,
    pool_class: PoolBase,
    hook_class: HookBase,
    hook_state: HookState | object | None,
) -> AddLiquidityResult:
    # Amounts are entering pool math, so round down.
    # Introducing amountsInScaled18 here and passing it through to _addLiquidity is not ideal,
    # but it avoids the even worse options of mutating amountsIn inside AddLiquidityParams,
    # or cluttering the AddLiquidityParams interface by adding amountsInScaled18.
    max_amounts_in_scaled18 = _copy_to_scaled18_apply_rate_round_down_array(
        add_liquidity_input.max_amounts_in_raw,
        pool_state.scaling_factors,
        pool_state.token_rates,
    )

    updated_balances_live_scaled18 = pool_state.balances_live_scaled18[:]
    if hook_class.should_call_before_add_liquidity:
        # Note - in SC balances and amounts are updated to reflect any rate change.
        # Daniel said we should not worry about this as any large rate changes
        # will mean something has gone wrong.
        # We do take into account and balance changes due
        # to hook using hookAdjustedBalancesScaled18.
        hook_return = hook_class.on_before_add_liquidity(
            add_liquidity_input.kind,
            add_liquidity_input.max_amounts_in_raw,
            add_liquidity_input.min_bpt_amount_out_raw,
            updated_balances_live_scaled18,
            hook_state,
        )
        if hook_return.success is False:
            raise SystemError("BeforeAddLiquidityHookFailed")
        for i, a in enumerate(hook_return.hook_adjusted_balances_scaled18):
            updated_balances_live_scaled18[i] = a

    if add_liquidity_input.kind.value == AddLiquidityKind.UNBALANCED.value:
        _require_unbalanced_liquidity_enabled(pool_state)
        amounts_in_scaled18 = max_amounts_in_scaled18
        unbalanced_result = compute_add_liquidity_unbalanced(
            updated_balances_live_scaled18,
            max_amounts_in_scaled18,
            pool_state.total_supply,
            pool_state.swap_fee,
            pool_class.get_maximum_invariant_ratio(),
            pool_class.compute_invariant,
        )
        bpt_amount_out = unbalanced_result.bpt_amount_out
        swap_fee_amounts_scaled18 = unbalanced_result.swap_fee_amounts

    elif (
        add_liquidity_input.kind.value == AddLiquidityKind.SINGLE_TOKEN_EXACT_OUT.value
    ):
        _require_unbalanced_liquidity_enabled(pool_state)
        token_index = _get_single_input_index(max_amounts_in_scaled18)
        amounts_in_scaled18 = max_amounts_in_scaled18
        bpt_amount_out = add_liquidity_input.min_bpt_amount_out_raw
        exact_out_result = compute_add_liquidity_single_token_exact_out(
            updated_balances_live_scaled18,
            token_index,
            bpt_amount_out,
            pool_state.total_supply,
            pool_state.swap_fee,
            pool_class.get_maximum_invariant_ratio(),
            pool_class.compute_balance,
        )
        amounts_in_scaled18[token_index] = exact_out_result.amount_in_with_fee
        swap_fee_amounts_scaled18 = exact_out_result.swap_fee_amounts
    else:
        raise ValueError("Unsupported AddLiquidity Kind")

    # Initialize amountsInRaw as a list with the same length as the tokens in the pool
    amounts_in_raw = [0] * len(pool_state.tokens)

    for i in range(len(pool_state.tokens)):
        # amountsInRaw are amounts actually entering the Pool, so we round up.
        amounts_in_raw[i] = _to_raw_undo_rate_round_up(
            amounts_in_scaled18[i],
            pool_state.scaling_factors[i],
            pool_state.token_rates[i],
        )

        # A Pool's token balance always decreases after an exit
        # Computes protocol and pool creator fee which is eventually taken from pool balance
        aggregate_swap_fee_amount_scaled18 = _compute_and_charge_aggregate_swap_fees(
            swap_fee_amounts_scaled18[i],
            pool_state.aggregate_swap_fee,
            pool_state.scaling_factors,
            pool_state.token_rates,
            i,
        )

        # Update the balances with the incoming amounts and subtract the swap fees
        updated_balances_live_scaled18[i] = (
            updated_balances_live_scaled18[i]
            + amounts_in_scaled18[i]
            - aggregate_swap_fee_amount_scaled18
        )

    if hook_class.should_call_after_add_liquidity:
        after_add_result = hook_class.on_after_add_liquidity(
            add_liquidity_input.kind,
            amounts_in_scaled18,
            amounts_in_raw,
            bpt_amount_out,
            updated_balances_live_scaled18,
            hook_state,
        )

        if after_add_result.success is False or len(
            after_add_result.hook_adjusted_amounts_in_raw
        ) is not len(amounts_in_raw):
            raise SystemError(
                "AfterAddLiquidityHookFailed",
                pool_state.pool_type,
                pool_state.hook_type,
            )

        # If hook adjusted amounts is not enabled, ignore amounts returned by the hook
        if hook_class.enable_hook_adjusted_amounts:
            for i, a in enumerate(after_add_result.hook_adjusted_amounts_in_raw):
                amounts_in_raw[i] = a

    return AddLiquidityResult(
        bpt_amount_out_raw=bpt_amount_out,
        amounts_in_raw=amounts_in_raw,
    )

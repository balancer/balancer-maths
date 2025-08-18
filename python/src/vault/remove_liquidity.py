from src.common.base_pool_math import (
    compute_proportional_amounts_out,
    compute_remove_liquidity_single_token_exact_in,
    compute_remove_liquidity_single_token_exact_out,
)
from src.common.pool_base import PoolBase
from src.common.types import (
    PoolState,
    RemoveLiquidityInput,
    RemoveLiquidityKind,
    RemoveLiquidityResult,
)
from src.common.utils import (
    _compute_and_charge_aggregate_swap_fees,
    _copy_to_scaled18_apply_rate_round_up_array,
    _get_single_input_index,
    _require_unbalanced_liquidity_enabled,
    _to_raw_undo_rate_round_down,
)
from src.hooks.types import HookBase, HookState


def remove_liquidity(
    remove_liquidity_input: RemoveLiquidityInput,
    pool_state: PoolState,
    pool_class: PoolBase,
    hook_class: HookBase,
    hook_state: HookState | object | None,
) -> RemoveLiquidityResult:
    # Round down when removing liquidity:
    # If proportional, lower balances = lower proportional amountsOut, favoring the pool.
    # If unbalanced, lower balances = lower invariant ratio without fees.
    # bptIn = supply * (1 - ratio), so lower ratio = more bptIn, favoring the pool.

    # Amounts are entering pool math higher amounts would burn more BPT, so round up to favor the pool.
    # Do not mutate minAmountsOut, so that we can directly compare the raw limits later, without potentially
    # losing precision by scaling up and then down.
    min_amounts_out_scaled18 = _copy_to_scaled18_apply_rate_round_up_array(
        remove_liquidity_input.min_amounts_out_raw,
        pool_state.scaling_factors,
        pool_state.token_rates,
    )

    updated_balances_live_scaled18 = pool_state.balances_live_scaled18[:]
    if hook_class.should_call_before_remove_liquidity:
        # Note - in SC balances and amounts are updated to reflect any rate change.
        # Daniel said we should not worry about this as any large rate changes
        # will mean something has gone wrong.
        # We do take into account and balance changes due
        # to hook using hookAdjustedBalancesScaled18.
        hook_return = hook_class.on_before_remove_liquidity(
            remove_liquidity_input.kind,
            remove_liquidity_input.max_bpt_amount_in_raw,
            remove_liquidity_input.min_amounts_out_raw,
            updated_balances_live_scaled18,
            hook_state,
        )
        if hook_return.success is False:
            raise SystemError("BeforeRemoveLiquidityHookFailed")

        for i, a in enumerate(hook_return.hook_adjusted_balances_scaled18):
            updated_balances_live_scaled18[i] = a

    if remove_liquidity_input.kind.value == RemoveLiquidityKind.PROPORTIONAL.value:
        bpt_amount_in = remove_liquidity_input.max_bpt_amount_in_raw
        swap_fee_amounts_scaled18 = [0] * len(pool_state.tokens)
        amounts_out_scaled18 = compute_proportional_amounts_out(
            updated_balances_live_scaled18,
            pool_state.total_supply,
            remove_liquidity_input.max_bpt_amount_in_raw,
        )
    elif (
        remove_liquidity_input.kind.value
        == RemoveLiquidityKind.SINGLE_TOKEN_EXACT_IN.value
    ):
        _require_unbalanced_liquidity_enabled(pool_state)
        bpt_amount_in = remove_liquidity_input.max_bpt_amount_in_raw
        amounts_out_scaled18 = min_amounts_out_scaled18
        token_out_index = _get_single_input_index(
            remove_liquidity_input.min_amounts_out_raw
        )
        exact_in_result = compute_remove_liquidity_single_token_exact_in(
            updated_balances_live_scaled18,
            token_out_index,
            remove_liquidity_input.max_bpt_amount_in_raw,
            pool_state.total_supply,
            pool_state.swap_fee,
            pool_class.get_minimum_invariant_ratio(),
            pool_class.compute_balance,
        )
        amounts_out_scaled18[token_out_index] = exact_in_result.amount_out_with_fee
        swap_fee_amounts_scaled18 = exact_in_result.swap_fee_amounts
    elif (
        remove_liquidity_input.kind.value
        == RemoveLiquidityKind.SINGLE_TOKEN_EXACT_OUT.value
    ):
        _require_unbalanced_liquidity_enabled(pool_state)
        amounts_out_scaled18 = min_amounts_out_scaled18
        token_out_index = _get_single_input_index(
            remove_liquidity_input.min_amounts_out_raw
        )
        exact_out_result = compute_remove_liquidity_single_token_exact_out(
            updated_balances_live_scaled18,
            token_out_index,
            amounts_out_scaled18[token_out_index],
            pool_state.total_supply,
            pool_state.swap_fee,
            pool_class.get_minimum_invariant_ratio(),
            pool_class.compute_invariant,
        )
        bpt_amount_in = exact_out_result.bpt_amount_in
        swap_fee_amounts_scaled18 = exact_out_result.swap_fee_amounts
    else:
        raise ValueError(
            "Unsupported RemoveLiquidity Kind", remove_liquidity_input.kind
        )

    amounts_out_raw = [0] * len(pool_state.tokens)

    for i in range(len(pool_state.tokens)):
        # amountsInRaw are amounts actually entering the Pool, so we round up.
        amounts_out_raw[i] = _to_raw_undo_rate_round_down(
            amounts_out_scaled18[i],
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

        updated_balances_live_scaled18[i] = updated_balances_live_scaled18[i] - (
            amounts_out_scaled18[i] + aggregate_swap_fee_amount_scaled18
        )

    if hook_class.should_call_after_remove_liquidity:
        after_remove_result = hook_class.on_after_remove_liquidity(
            remove_liquidity_input.kind,
            bpt_amount_in,
            amounts_out_scaled18,
            amounts_out_raw,
            updated_balances_live_scaled18,
            hook_state,
        )

        if after_remove_result.success is False or len(
            after_remove_result.hook_adjusted_amounts_out_raw
        ) is not len(amounts_out_raw):
            raise SystemError(
                "AfterRemoveLiquidityHookFailed",
                pool_state.pool_type,
                pool_state.hook_type,
            )

        # If hook adjusted amounts is not enabled, ignore amounts returned by the hook
        if hook_class.enable_hook_adjusted_amounts:
            for i, a in enumerate(after_remove_result.hook_adjusted_amounts_out_raw):
                amounts_out_raw[i] = a

    return RemoveLiquidityResult(
        bpt_amount_in_raw=bpt_amount_in,
        amounts_out_raw=amounts_out_raw,
    )

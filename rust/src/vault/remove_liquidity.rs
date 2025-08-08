//! Vault remove liquidity operations

use crate::common::errors::PoolError;
use crate::common::pool_base::PoolBase;
use crate::common::types::*;
use crate::common::utils::{
    compute_and_charge_aggregate_swap_fees, copy_to_scaled18_apply_rate_round_up_array,
    get_single_input_index, require_unbalanced_liquidity_enabled, to_raw_undo_rate_round_down,
};
use crate::hooks::types::HookState;
use crate::hooks::HookBase;
use crate::vault::base_pool_math::{
    compute_proportional_amounts_out, compute_remove_liquidity_single_token_exact_in,
    compute_remove_liquidity_single_token_exact_out,
};
use num_bigint::BigInt;
use num_traits::Zero;

/// Remove liquidity from a pool
pub fn remove_liquidity(
    remove_liquidity_input: &RemoveLiquidityInput,
    pool_state: &PoolState,
    pool_class: &dyn PoolBase,
    hook_class: &dyn HookBase,
    hook_state: Option<&HookState>,
) -> Result<RemoveLiquidityResult, PoolError> {
    let base_state = pool_state.base();

    // Round down when removing liquidity:
    // If proportional, lower balances = lower proportional amountsOut, favoring the pool.
    // If unbalanced, lower balances = lower invariant ratio without fees.
    // bptIn = supply * (1 - ratio), so lower ratio = more bptIn, favoring the pool.

    // Amounts are entering pool math higher amounts would burn more BPT, so round up to favor the pool.
    // Do not mutate minAmountsOut, so that we can directly compare the raw limits later, without potentially
    // losing precision by scaling up and then down.
    let min_amounts_out_scaled18 = copy_to_scaled18_apply_rate_round_up_array(
        &remove_liquidity_input.min_amounts_out_raw,
        &base_state.scaling_factors,
        &base_state.token_rates,
    )?;

    let mut updated_balances_live_scaled18 = base_state.balances_live_scaled_18.clone();

    // Call before remove liquidity hook if needed
    if hook_class.config().should_call_before_remove_liquidity {
        // Note - in SC balances and amounts are updated to reflect any rate change.
        // Daniel said we should not worry about this as any large rate changes
        // will mean something has gone wrong.
        // We do take into account and balance changes due
        // to hook using hookAdjustedBalancesScaled18.
        let hook_return = hook_class.on_before_remove_liquidity(
            remove_liquidity_input.kind.clone(),
            &remove_liquidity_input.max_bpt_amount_in_raw,
            &remove_liquidity_input.min_amounts_out_raw,
            &updated_balances_live_scaled18,
            hook_state.unwrap(),
        );
        if !hook_return.success {
            return Err(PoolError::BeforeRemoveLiquidityHookFailed);
        }

        for (i, adjusted_balance) in hook_return
            .hook_adjusted_balances_scaled_18
            .iter()
            .enumerate()
        {
            updated_balances_live_scaled18[i] = adjusted_balance.clone();
        }
    }

    let (bpt_amount_in, amounts_out_scaled18, swap_fee_amounts_scaled18) =
        match remove_liquidity_input.kind {
            RemoveLiquidityKind::Proportional => {
                let bpt_amount_in = remove_liquidity_input.max_bpt_amount_in_raw.clone();
                let swap_fee_amounts_scaled18 = vec![BigInt::zero(); base_state.tokens.len()];
                let amounts_out_scaled18 = compute_proportional_amounts_out(
                    &updated_balances_live_scaled18,
                    &base_state.total_supply,
                    &remove_liquidity_input.max_bpt_amount_in_raw,
                )?;
                (
                    bpt_amount_in,
                    amounts_out_scaled18,
                    swap_fee_amounts_scaled18,
                )
            }
            RemoveLiquidityKind::SingleTokenExactIn => {
                require_unbalanced_liquidity_enabled(pool_state)?;
                let bpt_amount_in = remove_liquidity_input.max_bpt_amount_in_raw.clone();
                let mut amounts_out_scaled18 = min_amounts_out_scaled18.clone();
                let token_out_index =
                    get_single_input_index(&remove_liquidity_input.min_amounts_out_raw)?;
                let computed = compute_remove_liquidity_single_token_exact_in(
                    &updated_balances_live_scaled18,
                    token_out_index,
                    &remove_liquidity_input.max_bpt_amount_in_raw,
                    &base_state.total_supply,
                    &base_state.swap_fee,
                    &pool_class.get_minimum_invariant_ratio(),
                    &|balances, token_out_index, invariant_ratio| {
                        pool_class.compute_balance(balances, token_out_index, invariant_ratio)
                    },
                )?;
                amounts_out_scaled18[token_out_index] = computed.amount_out_with_fee;
                (
                    bpt_amount_in,
                    amounts_out_scaled18,
                    computed.swap_fee_amounts,
                )
            }
            RemoveLiquidityKind::SingleTokenExactOut => {
                require_unbalanced_liquidity_enabled(pool_state)?;
                let amounts_out_scaled18 = min_amounts_out_scaled18.clone();
                let token_out_index =
                    get_single_input_index(&remove_liquidity_input.min_amounts_out_raw)?;
                let computed = compute_remove_liquidity_single_token_exact_out(
                    &updated_balances_live_scaled18,
                    token_out_index,
                    &amounts_out_scaled18[token_out_index],
                    &base_state.total_supply,
                    &base_state.swap_fee,
                    &pool_class.get_minimum_invariant_ratio(),
                    &|balances, rounding| pool_class.compute_invariant(balances, rounding),
                )?;
                let bpt_amount_in = computed.bpt_amount_in;
                (
                    bpt_amount_in,
                    amounts_out_scaled18,
                    computed.swap_fee_amounts,
                )
            }
        };

    let mut amounts_out_raw = vec![BigInt::zero(); base_state.tokens.len()];

    for i in 0..base_state.tokens.len() {
        // amountsInRaw are amounts actually entering the Pool, so we round up.
        amounts_out_raw[i] = to_raw_undo_rate_round_down(
            &amounts_out_scaled18[i],
            &base_state.scaling_factors[i],
            &base_state.token_rates[i],
        )?;

        // A Pool's token balance always decreases after an exit
        // Computes protocol and pool creator fee which is eventually taken from pool balance
        let aggregate_swap_fee_amount_scaled18 = compute_and_charge_aggregate_swap_fees(
            &swap_fee_amounts_scaled18[i],
            &base_state.aggregate_swap_fee,
            &base_state.scaling_factors,
            &base_state.token_rates,
            i,
        )?;

        updated_balances_live_scaled18[i] = &updated_balances_live_scaled18[i]
            - (&amounts_out_scaled18[i] + &aggregate_swap_fee_amount_scaled18);
    }

    // Call after remove liquidity hook if needed
    if hook_class.config().should_call_after_remove_liquidity {
        let hook_return = hook_class.on_after_remove_liquidity(
            remove_liquidity_input.kind.clone(),
            &bpt_amount_in,
            &amounts_out_scaled18,
            &amounts_out_raw,
            &updated_balances_live_scaled18,
            hook_state.unwrap(),
        );

        if !hook_return.success
            || hook_return.hook_adjusted_amounts_out_raw.len() != amounts_out_raw.len()
        {
            return Err(PoolError::AfterRemoveLiquidityHookFailed);
        }

        // If hook adjusted amounts is not enabled, ignore amounts returned by the hook
        if hook_class.config().enable_hook_adjusted_amounts {
            for (i, adjusted_amount) in hook_return.hook_adjusted_amounts_out_raw.iter().enumerate()
            {
                amounts_out_raw[i] = adjusted_amount.clone();
            }
        }
    }

    Ok(RemoveLiquidityResult {
        bpt_amount_in_raw: bpt_amount_in,
        amounts_out_raw,
    })
}

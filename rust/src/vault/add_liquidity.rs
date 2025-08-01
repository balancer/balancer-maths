//! Vault add liquidity operations

use crate::common::errors::PoolError;
use crate::common::pool_base::PoolBase;
use crate::common::types::*;
use crate::common::utils::{
    compute_and_charge_aggregate_swap_fees, copy_to_scaled18_apply_rate_round_down_array,
    get_single_input_index, require_unbalanced_liquidity_enabled, to_raw_undo_rate_round_up,
};
use crate::hooks::types::HookState;
use crate::hooks::HookBase;
use num_bigint::BigInt;
use num_traits::Zero;

/// Add liquidity to a pool
pub fn add_liquidity(
    add_liquidity_input: &AddLiquidityInput,
    pool_state: &PoolState,
    pool_class: &dyn PoolBase,
    hook_class: &dyn HookBase,
    hook_state: Option<&HookState>,
) -> Result<AddLiquidityResult, PoolError> {
    let base_state = pool_state.base();

    // Amounts are entering pool math, so round down.
    // Introducing amountsInScaled18 here and passing it through to _addLiquidity is not ideal,
    // but it avoids the even worse options of mutating amountsIn inside AddLiquidityParams,
    // or cluttering the AddLiquidityParams interface by adding amountsInScaled18.
    let max_amounts_in_scaled18 = copy_to_scaled18_apply_rate_round_down_array(
        &add_liquidity_input.max_amounts_in_raw,
        &base_state.scaling_factors,
        &base_state.token_rates,
    )?;

    let mut updated_balances_live_scaled18 = base_state.balances_live_scaled_18.clone();

    // Call before add liquidity hook if needed
    if hook_class.config().should_call_before_add_liquidity {
        // Note - in SC balances and amounts are updated to reflect any rate change.
        // Daniel said we should not worry about this as any large rate changes
        // will mean something has gone wrong.
        // We do take into account and balance changes due
        // to hook using hookAdjustedBalancesScaled18.
        let hook_return = hook_class.on_before_add_liquidity(
            add_liquidity_input.kind.clone(),
            &add_liquidity_input.max_amounts_in_raw, // Python passes raw amounts here
            &add_liquidity_input.min_bpt_amount_out_raw,
            &updated_balances_live_scaled18,
            hook_state.unwrap(),
        );
        if !hook_return.success {
            return Err(PoolError::BeforeAddLiquidityHookFailed);
        }
        for (i, adjusted_balance) in hook_return
            .hook_adjusted_balances_scaled_18
            .iter()
            .enumerate()
        {
            updated_balances_live_scaled18[i] = adjusted_balance.clone();
        }
    }

    // Initialize amounts_in_scaled18
    let mut amounts_in_scaled18 = vec![BigInt::zero(); base_state.tokens.len()];

    let (bpt_amount_out, swap_fee_amounts_scaled18) = match add_liquidity_input.kind {
        AddLiquidityKind::Unbalanced => {
            require_unbalanced_liquidity_enabled(pool_state)?;
            amounts_in_scaled18 = max_amounts_in_scaled18.clone();
            let computed = crate::vault::base_pool_math::compute_add_liquidity_unbalanced(
                &updated_balances_live_scaled18,
                &max_amounts_in_scaled18,
                &base_state.total_supply,
                &base_state.swap_fee,
                &pool_class.get_maximum_invariant_ratio(),
                &|balances, rounding| pool_class.compute_invariant(balances, rounding),
            )?;
            (computed.bpt_amount_out, computed.swap_fee_amounts)
        }
        AddLiquidityKind::SingleTokenExactOut => {
            require_unbalanced_liquidity_enabled(pool_state)?;
            let token_index = get_single_input_index(&max_amounts_in_scaled18)?;
            let bpt_amount_out = add_liquidity_input.min_bpt_amount_out_raw.clone();
            let computed =
                crate::vault::base_pool_math::compute_add_liquidity_single_token_exact_out(
                    &updated_balances_live_scaled18,
                    token_index,
                    &bpt_amount_out,
                    &base_state.total_supply,
                    &base_state.swap_fee,
                    &pool_class.get_maximum_invariant_ratio(),
                    &|balances, token_in_index, invariant_ratio| {
                        pool_class.compute_balance(balances, token_in_index, invariant_ratio)
                    },
                )?;
            amounts_in_scaled18[token_index] = computed.amount_in_with_fee;
            (bpt_amount_out, computed.swap_fee_amounts)
        }
    };

    // Initialize amountsInRaw as a list with the same length as the tokens in the pool
    let mut amounts_in_raw = vec![BigInt::zero(); base_state.tokens.len()];

    for i in 0..base_state.tokens.len() {
        // amountsInRaw are amounts actually entering the Pool, so we round up.
        amounts_in_raw[i] = to_raw_undo_rate_round_up(
            &amounts_in_scaled18[i],
            &base_state.scaling_factors[i],
            &base_state.token_rates[i],
        )?;

        // A Pool's token balance always decreases after an exit
        // Computes protocol and pool creator fee which is eventually taken from pool balance
        let aggregate_swap_fee_amount_scaled_18 = compute_and_charge_aggregate_swap_fees(
            &swap_fee_amounts_scaled18[i],
            &base_state.aggregate_swap_fee,
            &base_state.scaling_factors,
            &base_state.token_rates,
            i,
        )?;

        // Update the balances with the incoming amounts and subtract the swap fees
        updated_balances_live_scaled18[i] = &updated_balances_live_scaled18[i]
            + &max_amounts_in_scaled18[i]
            - &aggregate_swap_fee_amount_scaled_18;
    }

    // Call after add liquidity hook if needed
    if hook_class.config().should_call_after_add_liquidity {
        let hook_return = hook_class.on_after_add_liquidity(
            add_liquidity_input.kind.clone(),
            &max_amounts_in_scaled18,
            &amounts_in_raw,
            &bpt_amount_out,
            &updated_balances_live_scaled18,
            hook_state.unwrap(),
        );

        if !hook_return.success
            || hook_return.hook_adjusted_amounts_in_raw.len() != amounts_in_raw.len()
        {
            return Err(PoolError::AfterAddLiquidityHookFailed);
        }

        // If hook adjusted amounts is not enabled, ignore amounts returned by the hook
        if hook_class.config().enable_hook_adjusted_amounts {
            for (i, adjusted_amount) in hook_return.hook_adjusted_amounts_in_raw.iter().enumerate()
            {
                amounts_in_raw[i] = adjusted_amount.clone();
            }
        }
    }

    Ok(AddLiquidityResult {
        bpt_amount_out_raw: bpt_amount_out,
        amounts_in_raw,
    })
}

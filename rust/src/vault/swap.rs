//! Vault swap operations

use crate::common::constants::WAD;
use crate::common::errors::PoolError;
use crate::common::maths::{complement_fixed, mul_div_up_fixed, mul_up_fixed};
use crate::common::pool_base::PoolBase;
use crate::common::types::*;
use crate::common::utils::{
    compute_and_charge_aggregate_swap_fees, find_case_insensitive_index_in_list, to_raw_undo_rate_round_down, to_raw_undo_rate_round_up, to_scaled_18_apply_rate_round_down, to_scaled_18_apply_rate_round_up,
};
use crate::hooks::types::{AfterSwapParams, HookState};
use crate::hooks::HookBase;
use lazy_static::lazy_static;
use num_bigint::BigInt;
use num_traits::Zero;

lazy_static! {
    /// Minimum trade amount (scaled 18)
    static ref MINIMUM_TRADE_AMOUNT: BigInt = BigInt::from(1000000i64); // 1e6
}

/// Perform a swap operation
pub fn swap(
    swap_input: &SwapInput,
    pool_state: &PoolState,
    pool_class: &dyn PoolBase,
    hook_class: &dyn HookBase,
    hook_state: Option<&HookState>,
) -> Result<BigInt, PoolError> {
    if swap_input.amount_raw.is_zero() {
        return Ok(BigInt::zero());
    }

    let base_state = pool_state.base();

    // Find token indices (case insensitive)
    let input_index = find_case_insensitive_index_in_list(&base_state.tokens, &swap_input.token_in)
        .ok_or(PoolError::InputTokenNotFound)?;

    let output_index = find_case_insensitive_index_in_list(&base_state.tokens, &swap_input.token_out)
        .ok_or(PoolError::OutputTokenNotFound)?;

    // Compute amount given scaled to 18 decimals
    let amount_given_scaled_18 = compute_amount_given_scaled_18(
        &swap_input.amount_raw,
        swap_input.swap_kind.clone(),
        input_index,
        output_index,
        &base_state.scaling_factors,
        &base_state.token_rates,
    )?;

    // Create updated balances
    let mut updated_balances = base_state.balances_live_scaled_18.clone();

    // Create swap parameters
    let mut swap_params = SwapParams {
        swap_kind: swap_input.swap_kind.clone(),
        token_in_index: input_index,
        token_out_index: output_index,
        amount_scaled_18: amount_given_scaled_18.clone(),
        balances_live_scaled_18: updated_balances.clone(),
    };

    // Call before swap hook if needed
    if hook_class.config().should_call_before_swap {
        let result = hook_class.on_before_swap(&swap_params, hook_state.unwrap());
        if !result.success {
            return Err(PoolError::BeforeSwapHookFailed);
        }
        // Update balances with hook-adjusted balances
        for (i, adjusted_balance) in result.hook_adjusted_balances_scaled_18.iter().enumerate() {
            updated_balances[i] = adjusted_balance.clone();
        }
        swap_params.balances_live_scaled_18 = updated_balances.clone();
    }

    // Apply swap fees
    let mut swap_fee = base_state.swap_fee.clone();
    if hook_class.config().should_call_compute_dynamic_swap_fee {
        let result =
            hook_class.on_compute_dynamic_swap_fee(&swap_params, &swap_fee, hook_state.unwrap());
        if result.success {
            swap_fee = result.dynamic_swap_fee;
        }
    }

    let mut total_swap_fee_amount_scaled_18 = BigInt::zero();
    if swap_params.swap_kind == SwapKind::GivenIn {
        // Round up to avoid losses during precision loss
        total_swap_fee_amount_scaled_18 = mul_up_fixed(&swap_params.amount_scaled_18, &swap_fee)?;
        swap_params.amount_scaled_18 =
            &swap_params.amount_scaled_18 - &total_swap_fee_amount_scaled_18;
    }

    ensure_valid_swap_amount(&swap_params.amount_scaled_18)?;

    // Perform the swap
    let amount_calculated_scaled_18 = pool_class.on_swap(&swap_params)?;

    ensure_valid_swap_amount(&amount_calculated_scaled_18)?;

    // Convert result back to raw amount
    let amount_calculated_raw = match swap_input.swap_kind {
        SwapKind::GivenIn => {
            // For ExactIn the amount calculated is leaving the Vault, so we round down
            let rate_rounded_up = compute_rate_round_up(&base_state.token_rates[output_index]);
            to_raw_undo_rate_round_down(
                &amount_calculated_scaled_18,
                &base_state.scaling_factors[output_index],
                &rate_rounded_up,
            )?
        }
        SwapKind::GivenOut => {
            // For ExactOut, add swap fee and round up
            total_swap_fee_amount_scaled_18 = mul_div_up_fixed(
                &amount_calculated_scaled_18,
                &swap_fee,
                &complement_fixed(&swap_fee)?,
            )?;
            let amount_with_fee = &amount_calculated_scaled_18 + &total_swap_fee_amount_scaled_18;

            // For ExactOut the amount calculated is entering the Vault, so we round up
            to_raw_undo_rate_round_up(
                &amount_with_fee,
                &base_state.scaling_factors[input_index],
                &base_state.token_rates[input_index],
            )?
        }
    };

    // Compute and charge aggregate swap fees
    let aggregate_swap_fee_amount_scaled_18 = compute_and_charge_aggregate_swap_fees(
        &total_swap_fee_amount_scaled_18,
        &base_state.aggregate_swap_fee,
        &base_state.scaling_factors,
        &base_state.token_rates,
        input_index,
    )?;

    // Update balances
    let (balance_in_increment, balance_out_decrement) = match swap_input.swap_kind {
        SwapKind::GivenIn => (
            &amount_given_scaled_18 - &aggregate_swap_fee_amount_scaled_18,
            amount_calculated_scaled_18.clone(),
        ),
        SwapKind::GivenOut => (
            &amount_calculated_scaled_18 - &aggregate_swap_fee_amount_scaled_18,
            amount_given_scaled_18.clone(),
        ),
    };

    updated_balances[input_index] = &updated_balances[input_index] + &balance_in_increment;
    updated_balances[output_index] = &updated_balances[output_index] - &balance_out_decrement;

    // Call after swap hook if needed
    let mut final_amount_calculated_raw = amount_calculated_raw.clone();
    if hook_class.config().should_call_after_swap {
        let after_swap_params = AfterSwapParams {
            kind: swap_input.swap_kind.clone(),
            token_in: swap_input.token_in.clone(),
            token_out: swap_input.token_out.clone(),
            amount_in_scaled_18: amount_given_scaled_18.clone(),
            amount_out_scaled_18: amount_calculated_scaled_18.clone(),
            token_in_balance_scaled_18: updated_balances[input_index].clone(),
            token_out_balance_scaled_18: updated_balances[output_index].clone(),
            amount_calculated_scaled_18: amount_calculated_scaled_18.clone(),
            amount_calculated_raw: amount_calculated_raw.clone(),
        };

        let result = hook_class.on_after_swap(&after_swap_params, hook_state.unwrap());
        if !result.success {
            return Err(PoolError::AfterSwapHookFailed);
        }

        // If hook adjusted amounts is enabled, use the hook-adjusted amount
        if hook_class.config().enable_hook_adjusted_amounts {
            final_amount_calculated_raw = result.hook_adjusted_amount_calculated_raw;
        }
    }

    Ok(final_amount_calculated_raw)
}

/// Compute amount given scaled to 18 decimals
pub fn compute_amount_given_scaled_18(
    amount_given_raw: &BigInt,
    swap_kind: SwapKind,
    index_in: usize,
    index_out: usize,
    scaling_factors: &[BigInt],
    token_rates: &[BigInt],
) -> Result<BigInt, PoolError> {
    match swap_kind {
        SwapKind::GivenIn => {
            // If the amountGiven is entering the pool math (ExactIn), round down
            // since a lower apparent amountIn leads to a lower calculated amountOut, favoring the pool.
            Ok(to_scaled_18_apply_rate_round_down(
                amount_given_raw,
                &scaling_factors[index_in],
                &token_rates[index_in],
            )?)
        }
        SwapKind::GivenOut => {
            // For ExactOut, round up to favor the pool
            Ok(to_scaled_18_apply_rate_round_up(
                amount_given_raw,
                &scaling_factors[index_out],
                &token_rates[index_out],
            )?)
        }
    }
}

/// Compute rate rounded up
pub fn compute_rate_round_up(rate: &BigInt) -> BigInt {
    let rounded_rate = (rate / &*WAD) * &*WAD;
    if &rounded_rate == rate {
        rate.clone()
    } else {
        rate + BigInt::from(1)
    }
}

/// Ensure valid swap amount
pub fn ensure_valid_swap_amount(trade_amount: &BigInt) -> Result<(), PoolError> {
    if trade_amount < &*MINIMUM_TRADE_AMOUNT {
        return Err(PoolError::TradeAmountTooSmall);
    }
    Ok(())
}

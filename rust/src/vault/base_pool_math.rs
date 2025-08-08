//! Base pool math functions for vault operations

use crate::common::errors::PoolError;
use crate::common::maths::{
    complement_fixed, div_down_fixed, div_up_fixed, mul_div_up_fixed, mul_down_fixed, mul_up_fixed,
};
use crate::common::types::Rounding;
use num_bigint::BigInt;
use num_traits::Zero;

/// Result of add liquidity unbalanced operation
#[derive(Debug, Clone)]
pub struct AddLiquidityUnbalancedResult {
    pub bpt_amount_out: BigInt,
    pub swap_fee_amounts: Vec<BigInt>,
}

/// Result of add liquidity single token exact out operation
#[derive(Debug, Clone)]
pub struct AddLiquiditySingleTokenExactOutResult {
    pub amount_in_with_fee: BigInt,
    pub swap_fee_amounts: Vec<BigInt>,
}

/// Result of remove liquidity single token exact in operation
#[derive(Debug, Clone)]
pub struct RemoveLiquiditySingleTokenExactInResult {
    pub amount_out_with_fee: BigInt,
    pub swap_fee_amounts: Vec<BigInt>,
}

/// Result of remove liquidity single token exact out operation
#[derive(Debug, Clone)]
pub struct RemoveLiquiditySingleTokenExactOutResult {
    pub bpt_amount_in: BigInt,
    pub swap_fee_amounts: Vec<BigInt>,
}

/// Compute add liquidity for unbalanced amounts
pub fn compute_add_liquidity_unbalanced(
    current_balances: &[BigInt],
    exact_amounts: &[BigInt],
    total_supply: &BigInt,
    swap_fee_percentage: &BigInt,
    max_invariant_ratio: &BigInt,
    compute_invariant: &dyn Fn(&[BigInt], Rounding) -> Result<BigInt, PoolError>,
) -> Result<AddLiquidityUnbalancedResult, PoolError> {
    let num_tokens = current_balances.len();

    // Create new balances with added amounts
    let mut new_balances = vec![BigInt::zero(); num_tokens];
    let mut swap_fee_amounts = vec![BigInt::zero(); num_tokens];

    // Loop through each token, updating the balance with the added amount
    for index in 0..current_balances.len() {
        new_balances[index] = &current_balances[index] + &exact_amounts[index] - BigInt::from(1);
    }

    // Calculate current and new invariants
    let current_invariant = compute_invariant(current_balances, Rounding::RoundUp)?;
    let new_invariant = compute_invariant(&new_balances, Rounding::RoundDown)?;

    // Calculate invariant ratio
    let invariant_ratio = div_down_fixed(&new_invariant, &current_invariant)?;

    // Check invariant ratio bounds
    if &invariant_ratio > max_invariant_ratio {
        return Err(PoolError::MathOverflow);
    }

    // Apply fees to non-proportional amounts
    for index in 0..current_balances.len() {
        let proportional_token_balance =
            mul_down_fixed(&invariant_ratio, &current_balances[index])?;
        if new_balances[index] > proportional_token_balance {
            let taxable_amount = &new_balances[index] - &proportional_token_balance;
            let fee_amount = mul_up_fixed(&taxable_amount, swap_fee_percentage)?;
            swap_fee_amounts[index] = fee_amount.clone();
            new_balances[index] = &new_balances[index] - &fee_amount;
        }
    }

    // Calculate invariant with fees applied
    let invariant_with_fees_applied = compute_invariant(&new_balances, Rounding::RoundDown)?;

    // Calculate BPT amount out
    let bpt_amount_out =
        (total_supply * (&invariant_with_fees_applied - &current_invariant)) / &current_invariant;

    Ok(AddLiquidityUnbalancedResult {
        bpt_amount_out,
        swap_fee_amounts,
    })
}

/// Compute add liquidity for single token exact out
pub fn compute_add_liquidity_single_token_exact_out(
    current_balances: &[BigInt],
    token_in_index: usize,
    exact_bpt_amount_out: &BigInt,
    total_supply: &BigInt,
    swap_fee_percentage: &BigInt,
    max_invariant_ratio: &BigInt,
    compute_balance: &dyn Fn(&[BigInt], usize, &BigInt) -> Result<BigInt, PoolError>,
) -> Result<AddLiquiditySingleTokenExactOutResult, PoolError> {
    let new_supply = exact_bpt_amount_out + total_supply;
    let invariant_ratio = div_up_fixed(&new_supply, total_supply)?;

    // Check invariant ratio bounds
    if &invariant_ratio > max_invariant_ratio {
        return Err(PoolError::MathOverflow);
    }

    // Calculate new balance needed
    let new_balance = compute_balance(current_balances, token_in_index, &invariant_ratio)?;
    let amount_in = &new_balance - &current_balances[token_in_index];

    // Calculate non-taxable balance
    let non_taxable_balance = div_down_fixed(
        &mul_down_fixed(&new_supply, &current_balances[token_in_index])?,
        total_supply,
    )?;

    let taxable_amount = &amount_in + &current_balances[token_in_index] - &non_taxable_balance;

    // Calculate fee
    let fee =
        div_up_fixed(&taxable_amount, &complement_fixed(swap_fee_percentage)?)? - &taxable_amount;

    // Create swap fees array
    let mut swap_fee_amounts = vec![BigInt::zero(); current_balances.len()];
    swap_fee_amounts[token_in_index] = fee.clone();

    let amount_in_with_fee = &amount_in + &fee;
    Ok(AddLiquiditySingleTokenExactOutResult {
        amount_in_with_fee,
        swap_fee_amounts,
    })
}

/// Compute proportional amounts out for remove liquidity
pub fn compute_proportional_amounts_out(
    balances: &[BigInt],
    bpt_total_supply: &BigInt,
    bpt_amount_in: &BigInt,
) -> Result<Vec<BigInt>, PoolError> {
    let mut amounts_out = Vec::with_capacity(balances.len());

    for balance in balances {
        let amount_out = (balance * bpt_amount_in) / bpt_total_supply;
        amounts_out.push(amount_out);
    }

    Ok(amounts_out)
}

/// Compute remove liquidity single token exact in
pub fn compute_remove_liquidity_single_token_exact_in(
    current_balances: &[BigInt],
    token_out_index: usize,
    exact_bpt_amount_in: &BigInt,
    total_supply: &BigInt,
    swap_fee_percentage: &BigInt,
    min_invariant_ratio: &BigInt,
    compute_balance: &dyn Fn(&[BigInt], usize, &BigInt) -> Result<BigInt, PoolError>,
) -> Result<RemoveLiquiditySingleTokenExactInResult, PoolError> {
    // Calculate new supply accounting for burning exact_bpt_amount_in
    let new_supply = total_supply - exact_bpt_amount_in;

    let invariant_ratio = div_up_fixed(&new_supply, total_supply)?;

    // Check invariant ratio bounds
    if &invariant_ratio < min_invariant_ratio {
        return Err(PoolError::MathOverflow);
    }

    // Calculate the new balance of the output token after the BPT burn
    let new_balance = compute_balance(current_balances, token_out_index, &invariant_ratio)?;

    // Compute the amount to be withdrawn from the pool
    let amount_out = &current_balances[token_out_index] - &new_balance;

    let new_balance_before_tax = mul_div_up_fixed(
        &new_supply,
        &current_balances[token_out_index],
        total_supply,
    )?;

    // Compute the taxable amount: the difference between the non-taxable balance and actual withdrawal
    let taxable_amount = &new_balance_before_tax - &new_balance;

    // Calculate the swap fee on the taxable amount
    let fee = mul_up_fixed(&taxable_amount, swap_fee_percentage)?;

    // Create swap fees array
    let mut swap_fee_amounts = vec![BigInt::zero(); current_balances.len()];
    swap_fee_amounts[token_out_index] = fee.clone();

    // Return the net amount after subtracting the fee
    let amount_out_with_fee = &amount_out - &fee;
    Ok(RemoveLiquiditySingleTokenExactInResult {
        amount_out_with_fee,
        swap_fee_amounts,
    })
}

/// Compute remove liquidity single token exact out
pub fn compute_remove_liquidity_single_token_exact_out(
    current_balances: &[BigInt],
    token_out_index: usize,
    exact_amount_out: &BigInt,
    total_supply: &BigInt,
    swap_fee_percentage: &BigInt,
    min_invariant_ratio: &BigInt,
    compute_invariant: &dyn Fn(&[BigInt], Rounding) -> Result<BigInt, PoolError>,
) -> Result<RemoveLiquiditySingleTokenExactOutResult, PoolError> {
    let num_tokens = current_balances.len();

    // Create new balances array
    let mut new_balances = vec![BigInt::zero(); num_tokens];

    // Copy current_balances to new_balances
    for index in 0..current_balances.len() {
        new_balances[index] = &current_balances[index] - BigInt::from(1);
    }

    // Update the balance of token_out_index with exact_amount_out
    new_balances[token_out_index] = &new_balances[token_out_index] - exact_amount_out;

    // Calculate the invariant using the current balances
    let current_invariant = compute_invariant(current_balances, Rounding::RoundUp)?;

    let invariant_ratio = div_up_fixed(
        &compute_invariant(&new_balances, Rounding::RoundUp)?,
        &current_invariant,
    )?;

    // Check invariant ratio bounds
    if &invariant_ratio < min_invariant_ratio {
        return Err(PoolError::MathOverflow);
    }

    // Taxable amount is proportional to invariant ratio
    let taxable_amount = &mul_up_fixed(&invariant_ratio, &current_balances[token_out_index])?
        - &new_balances[token_out_index];

    let fee =
        div_up_fixed(&taxable_amount, &complement_fixed(swap_fee_percentage)?)? - &taxable_amount;

    // Update new balances array with a fee
    new_balances[token_out_index] = &new_balances[token_out_index] - &fee;

    // Calculate the new invariant with fees applied
    let invariant_with_fees_applied = compute_invariant(&new_balances, Rounding::RoundDown)?;

    // Create swap fees array
    let mut swap_fee_amounts = vec![BigInt::zero(); num_tokens];
    swap_fee_amounts[token_out_index] = fee.clone();

    // Calculate the amount of BPT to burn
    let bpt_amount_in = mul_div_up_fixed(
        total_supply,
        &(&current_invariant - &invariant_with_fees_applied),
        &current_invariant,
    )?;

    Ok(RemoveLiquiditySingleTokenExactOutResult {
        bpt_amount_in,
        swap_fee_amounts,
    })
}

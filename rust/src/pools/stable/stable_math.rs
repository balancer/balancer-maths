use crate::common::errors::PoolError;
use crate::common::maths::div_up;
use num_bigint::BigInt;
use num_traits::Zero;

/// Amplification precision
pub const AMP_PRECISION: u64 = 1000;

/// Invariant growth limit: non-proportional add cannot cause the invariant to increase by more than this ratio.
pub const _MIN_INVARIANT_RATIO: u64 = 60e16 as u64; // 60%
/// Invariant shrink limit: non-proportional remove cannot cause the invariant to decrease by less than this ratio.
pub const _MAX_INVARIANT_RATIO: u64 = 500e16 as u64; // 500%

/// Calculate the invariant for the stable swap curve.
pub fn compute_invariant(
    amplification_parameter: &BigInt,
    balances: &[BigInt],
) -> Result<BigInt, PoolError> {
    // Calculate the sum of balances
    let total_balance: BigInt = balances.iter().sum();
    let num_tokens = balances.len() as u64;

    if total_balance == BigInt::zero() {
        return Ok(BigInt::zero());
    }

    // Initial invariant and amplification
    let mut invariant = total_balance.clone();
    let amp_times_total = amplification_parameter * num_tokens;

    // Iteratively compute the invariant
    for _ in 0..255 {
        let mut d_p = invariant.clone();

        for balance in balances {
            d_p = (&d_p * &invariant) / (balance * num_tokens);
        }

        let prev_invariant = invariant.clone();

        let numerator = (&amp_times_total * &total_balance) / BigInt::from(AMP_PRECISION);
        let numerator = numerator + (d_p.clone() * BigInt::from(num_tokens));
        let numerator = numerator * &invariant;

        let amp_minus_precision = &amp_times_total - BigInt::from(AMP_PRECISION);
        let denominator = (amp_minus_precision * &invariant) / BigInt::from(AMP_PRECISION);
        let denominator = denominator + (BigInt::from(num_tokens + 1) * d_p);

        invariant = numerator / denominator;

        // Check for convergence
        if invariant > prev_invariant {
            if &invariant - &prev_invariant <= BigInt::from(1u64) {
                return Ok(invariant);
            }
        } else if &prev_invariant - &invariant <= BigInt::from(1u64) {
            return Ok(invariant);
        }
    }

    Err(PoolError::StableInvariantDidntConverge)
}

/// Compute how many tokens can be taken out of a pool if `token_amount_in` are sent
pub fn compute_out_given_exact_in(
    amplification_parameter: &BigInt,
    balances: &[BigInt],
    token_index_in: usize,
    token_index_out: usize,
    token_amount_in: &BigInt,
    invariant: &BigInt,
) -> Result<BigInt, PoolError> {
    let mut balances_copy = balances.to_vec();

    // Add the token amount to the input balance
    balances_copy[token_index_in] += token_amount_in;

    // Calculate the final balance out
    let final_balance_out = compute_balance(
        amplification_parameter,
        &balances_copy,
        invariant,
        token_index_out,
    )?;

    // Calculate and return the amount of tokens out, rounding down
    Ok(&balances_copy[token_index_out] - &final_balance_out - BigInt::from(1u64))
}

/// Compute how many tokens must be sent to a pool to take out `token_amount_out`
pub fn compute_in_given_exact_out(
    amplification_parameter: &BigInt,
    balances: &[BigInt],
    token_index_in: usize,
    token_index_out: usize,
    token_amount_out: &BigInt,
    invariant: &BigInt,
) -> Result<BigInt, PoolError> {
    let mut balances_copy = balances.to_vec();

    // Subtract the token amount from the output balance
    balances_copy[token_index_out] -= token_amount_out;

    // Calculate the final balance in
    let final_balance_in = compute_balance(
        amplification_parameter,
        &balances_copy,
        invariant,
        token_index_in,
    )?;

    // Calculate and return the amount of tokens in, rounding up
    Ok(&final_balance_in - &balances_copy[token_index_in] + BigInt::from(1u64))
}

/// Compute the balance of a token given the invariant
pub fn compute_balance(
    amplification_parameter: &BigInt,
    balances: &[BigInt],
    invariant: &BigInt,
    token_index: usize,
) -> Result<BigInt, PoolError> {
    let num_tokens = balances.len() as u64;
    let amp_times_total = amplification_parameter * BigInt::from(num_tokens);

    // Calculate sum and P_D
    let mut sum = balances[0].clone();
    let mut p_d = &balances[0] * BigInt::from(num_tokens);

    for balance in balances.iter().skip(1) {
        p_d = (&p_d * balance * BigInt::from(num_tokens)) / invariant;
        sum += balance;
    }

    sum -= &balances[token_index];

    // Calculate inv2 and c
    let inv2 = invariant * invariant;
    let c = div_up(
        &(inv2.clone() * BigInt::from(AMP_PRECISION)),
        &(amp_times_total.clone() * p_d),
    )? * &balances[token_index];

    let b = sum + (invariant * BigInt::from(AMP_PRECISION)) / &amp_times_total;

    // Initial approximation
    let mut token_balance = div_up(&(inv2 + c.clone()), &(invariant + b.clone()))?;

    // Iteratively solve for tokenBalance
    for _i in 0..255 {
        let prev_token_balance = token_balance.clone();
        token_balance = div_up(
            &(token_balance.clone() * token_balance.clone() + c.clone()),
            &(token_balance * BigInt::from(2) + b.clone() - invariant),
        )?;

        // Check for convergence
        if token_balance > prev_token_balance {
            if &token_balance - &prev_token_balance <= BigInt::from(1) {
                return Ok(token_balance);
            }
        } else if &prev_token_balance - &token_balance <= BigInt::from(1) {
            return Ok(token_balance);
        }
    }

    Err(PoolError::StableInvariantDidntConverge)
}

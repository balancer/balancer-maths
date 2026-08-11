use crate::common::constants::{RAY, TWO_WAD, WAD};
use crate::common::errors::PoolError;
use crate::common::log_exp_math;
use crate::common::maths::{
    div_down_fixed, div_up_fixed, mul_div_up_fixed, mul_down_fixed, mul_up_fixed, pow_down_fixed,
};
use crate::common::oz_math::sqrt;
use crate::common::types::Rounding;
use alloy_primitives::{uint, U256};

// Constants
const A: usize = 0;
const B: usize = 1;
pub const THIRTY_DAYS_SECONDS: U256 = uint!(2592000_U256); // 30 * 24 * 60 * 60 seconds

/// Compute current virtual balances for ReClammV2 pool
#[allow(clippy::too_many_arguments)]
pub fn compute_current_virtual_balances(
    current_timestamp: &U256,
    balances_scaled_18: &[U256],
    last_virtual_balance_a: &U256,
    last_virtual_balance_b: &U256,
    daily_price_shift_base: &U256,
    last_timestamp: &U256,
    centeredness_margin: &U256,
    start_fourth_root_price_ratio: &U256,
    end_fourth_root_price_ratio: &U256,
    price_ratio_update_start_time: &U256,
    price_ratio_update_end_time: &U256,
) -> Result<(U256, U256, bool), PoolError> {
    if last_timestamp == current_timestamp {
        return Ok((*last_virtual_balance_a, *last_virtual_balance_b, false));
    }

    let mut current_virtual_balance_a = *last_virtual_balance_a;
    let mut current_virtual_balance_b = *last_virtual_balance_b;

    let current_fourth_root_price_ratio = compute_fourth_root_price_ratio(
        current_timestamp,
        start_fourth_root_price_ratio,
        end_fourth_root_price_ratio,
        price_ratio_update_start_time,
        price_ratio_update_end_time,
    )?;

    let mut changed = false;

    // If the price ratio is updating, shrink/expand the price interval by recalculating the virtual balances.
    if current_timestamp > price_ratio_update_start_time
        && last_timestamp < price_ratio_update_end_time
    {
        let (new_virtual_balance_a, new_virtual_balance_b) =
            compute_virtual_balances_updating_price_ratio(
                &current_fourth_root_price_ratio,
                balances_scaled_18,
                last_virtual_balance_a,
                last_virtual_balance_b,
            )?;

        current_virtual_balance_a = new_virtual_balance_a;
        current_virtual_balance_b = new_virtual_balance_b;
        changed = true;
    }

    let (centeredness, is_pool_above_center) = compute_centeredness(
        balances_scaled_18,
        &current_virtual_balance_a,
        &current_virtual_balance_b,
    )?;

    // If the pool is outside the target range, track the market price by moving the price interval.
    if centeredness < *centeredness_margin {
        let (new_virtual_balance_a, new_virtual_balance_b) =
            compute_virtual_balances_updating_price_range(
                balances_scaled_18,
                &current_virtual_balance_a,
                &current_virtual_balance_b,
                is_pool_above_center,
                daily_price_shift_base,
                current_timestamp,
                last_timestamp,
            )?;

        current_virtual_balance_a = new_virtual_balance_a;
        current_virtual_balance_b = new_virtual_balance_b;
        changed = true;
    }

    Ok((
        current_virtual_balance_a,
        current_virtual_balance_b,
        changed,
    ))
}

/// Compute virtual balances when updating price ratio
fn compute_virtual_balances_updating_price_ratio(
    current_fourth_root_price_ratio: &U256,
    balances_scaled_18: &[U256],
    last_virtual_balance_a: &U256,
    last_virtual_balance_b: &U256,
) -> Result<(U256, U256), PoolError> {
    // Compute the current pool centeredness, which will remain constant.
    let (centeredness, is_pool_above_center) = compute_centeredness(
        balances_scaled_18,
        last_virtual_balance_a,
        last_virtual_balance_b,
    )?;

    // The overvalued token is the one with a lower token balance (therefore, rarer and more valuable).
    let (
        balance_token_undervalued,
        last_virtual_balance_undervalued,
        last_virtual_balance_overvalued,
    ) = if is_pool_above_center {
        (
            balances_scaled_18[A],
            *last_virtual_balance_a,
            *last_virtual_balance_b,
        )
    } else {
        (
            balances_scaled_18[B],
            *last_virtual_balance_b,
            *last_virtual_balance_a,
        )
    };

    // The original formula was a quadratic equation, with terms:
    // a = Q0 - 1
    // b = - Ru (1 + C)
    // c = - Ru^2 C
    // where Q0 is the square root of the price ratio, Ru is the undervalued token balance, and C is the
    // centeredness. Applying Bhaskara, we'd have: Vu = (-b + sqrt(b^2 - 4ac)) / 2a.
    // The Bhaskara above can be simplified by replacing a, b and c with the terms above, which leads to:
    // Vu = Ru(1 + C + sqrt(1 + C (C + 4 Q0 - 2))) / 2(Q0 - 1)
    let sqrt_price_ratio = mul_down_fixed(
        current_fourth_root_price_ratio,
        current_fourth_root_price_ratio,
    )?;

    // Using FixedPoint math as little as possible to improve the precision of the result.
    // Note: The input of sqrt must be a 36-decimal number, so that the final result is 18 decimals.
    let centeredness_inner = (centeredness + (U256::from(4) * sqrt_price_ratio))
        .checked_sub(TWO_WAD)
        .ok_or(PoolError::MathOverflow)?;
    let sqrt_input = centeredness * centeredness_inner + RAY;
    let sqrt_result = sqrt(&sqrt_input);

    let q0_minus_one = sqrt_price_ratio
        .checked_sub(WAD)
        .ok_or(PoolError::MathOverflow)?;
    let denominator = U256::from(2) * q0_minus_one;
    if denominator.is_zero() {
        return Err(PoolError::ZeroInvariant);
    }

    let virtual_balance_undervalued =
        balance_token_undervalued * (WAD + centeredness + sqrt_result) / denominator;

    if last_virtual_balance_undervalued.is_zero() {
        return Err(PoolError::ZeroInvariant);
    }
    let virtual_balance_overvalued = virtual_balance_undervalued * last_virtual_balance_overvalued
        / last_virtual_balance_undervalued;

    if is_pool_above_center {
        Ok((virtual_balance_undervalued, virtual_balance_overvalued))
    } else {
        Ok((virtual_balance_overvalued, virtual_balance_undervalued))
    }
}

/// Compute virtual balances when updating price range
fn compute_virtual_balances_updating_price_range(
    balances_scaled_18: &[U256],
    virtual_balance_a: &U256,
    virtual_balance_b: &U256,
    is_pool_above_center: bool,
    daily_price_shift_base: &U256,
    current_timestamp: &U256,
    last_timestamp: &U256,
) -> Result<(U256, U256), PoolError> {
    let sqrt_price_ratio = sqrt_scaled_18(&compute_price_ratio(
        balances_scaled_18,
        virtual_balance_a,
        virtual_balance_b,
    )?);

    // The overvalued token is the one with a lower token balance (therefore, rarer and more valuable).
    let (
        balances_scaled_undervalued,
        balances_scaled_overvalued,
        _virtual_balance_undervalued,
        virtual_balance_overvalued,
    ) = if is_pool_above_center {
        (
            balances_scaled_18[0],
            balances_scaled_18[1],
            *virtual_balance_a,
            *virtual_balance_b,
        )
    } else {
        (
            balances_scaled_18[1],
            balances_scaled_18[0],
            *virtual_balance_b,
            *virtual_balance_a,
        )
    };

    // +-----------------------------------------+
    // |                      (Tc - Tl)          |
    // |      Vo = Vo * (Psb)^                   |
    // +-----------------------------------------+
    // |  Where:                                 |
    // |    Vo = Virtual balance overvalued      |
    // |    Psb = Price shift daily rate base    |
    // |    Tc = Current timestamp               |
    // |    Tl = Last timestamp                  |
    // +-----------------------------------------+
    // |               Ru * (Vo + Ro)            |
    // |      Vu = ----------------------        |
    // |             (Qo - 1) * Vo - Ro          |
    // +-----------------------------------------+
    // |  Where:                                 |
    // |    Vu = Virtual balance undervalued     |
    // |    Vo = Virtual balance overvalued      |
    // |    Ru = Real balance undervalued        |
    // |    Ro = Real balance overvalued         |
    // |    Qo = Square root of price ratio      |
    // +-----------------------------------------+

    // Cap the duration (time between operations) at 30 days, to ensure `pow_down` does not overflow.
    let duration = std::cmp::min(
        current_timestamp
            .checked_sub(*last_timestamp)
            .ok_or(PoolError::MathOverflow)?,
        THIRTY_DAYS_SECONDS,
    );

    let mut virtual_balance_overvalued = mul_down_fixed(
        &virtual_balance_overvalued,
        &pow_down_fixed(daily_price_shift_base, &(duration * WAD))?,
    )?;

    // Ensure that Vo does not go below the minimum allowed value (corresponding to centeredness == 1).
    let min_virtual_balance_overvalued = div_down_fixed(
        &balances_scaled_overvalued,
        &sqrt_scaled_18(&sqrt_price_ratio)
            .checked_sub(WAD)
            .ok_or(PoolError::MathOverflow)?,
    )?;

    if virtual_balance_overvalued < min_virtual_balance_overvalued {
        virtual_balance_overvalued = min_virtual_balance_overvalued;
    }

    let q0_minus_one = sqrt_price_ratio
        .checked_sub(WAD)
        .ok_or(PoolError::MathOverflow)?;
    let denominator = mul_down_fixed(&q0_minus_one, &virtual_balance_overvalued)?
        .checked_sub(balances_scaled_overvalued)
        .ok_or(PoolError::MathOverflow)?;
    if denominator.is_zero() {
        return Err(PoolError::ZeroInvariant);
    }

    let virtual_balance_undervalued = balances_scaled_undervalued
        * (virtual_balance_overvalued + balances_scaled_overvalued)
        / denominator;

    if is_pool_above_center {
        Ok((virtual_balance_undervalued, virtual_balance_overvalued))
    } else {
        Ok((virtual_balance_overvalued, virtual_balance_undervalued))
    }
}

/// Compute price ratio
fn compute_price_ratio(
    balances_scaled_18: &[U256],
    virtual_balance_a: &U256,
    virtual_balance_b: &U256,
) -> Result<U256, PoolError> {
    let (min_price, max_price) =
        compute_price_range(balances_scaled_18, virtual_balance_a, virtual_balance_b)?;

    div_up_fixed(&max_price, &min_price)
}

/// Compute price range
fn compute_price_range(
    balances_scaled_18: &[U256],
    virtual_balance_a: &U256,
    virtual_balance_b: &U256,
) -> Result<(U256, U256), PoolError> {
    let current_invariant = compute_invariant(
        balances_scaled_18,
        virtual_balance_a,
        virtual_balance_b,
        Rounding::RoundDown,
    )?;

    if current_invariant.is_zero() {
        return Err(PoolError::ZeroInvariant);
    }

    // P_min(a) = Vb / (Va + Ra_max)
    // We don't have Ra_max, but: invariant=(Ra_max + Va)(Vb)
    // Then, (Va + Ra_max) = invariant/Vb, and:
    // P_min(a) = Vb^2 / invariant
    let min_price = virtual_balance_b * virtual_balance_b / current_invariant;

    // Similarly, P_max(a) = (Rb_max + Vb)/Va
    // We don't have Rb_max, but: invariant=(Rb_max + Vb)(Va)
    // Then, (Rb_max + Vb) = invariant/Va, and:
    // P_max(a) = invariant / Va^2
    let max_price = div_down_fixed(
        &current_invariant,
        &mul_down_fixed(virtual_balance_a, virtual_balance_a)?,
    )?;

    Ok((min_price, max_price))
}

/// Compute fourth root price ratio
fn compute_fourth_root_price_ratio(
    current_time: &U256,
    start_fourth_root_price_ratio: &U256,
    end_fourth_root_price_ratio: &U256,
    price_ratio_update_start_time: &U256,
    price_ratio_update_end_time: &U256,
) -> Result<U256, PoolError> {
    // if start and end time are the same, return end value.
    if current_time >= price_ratio_update_end_time {
        Ok(*end_fourth_root_price_ratio)
    } else if current_time <= price_ratio_update_start_time {
        Ok(*start_fourth_root_price_ratio)
    } else {
        let exponent = div_down_fixed(
            &(current_time - price_ratio_update_start_time),
            &(price_ratio_update_end_time - price_ratio_update_start_time),
        )?;

        let current_fourth_root_price_ratio = mul_down_fixed(
            start_fourth_root_price_ratio,
            &log_exp_math::pow(
                &div_down_fixed(end_fourth_root_price_ratio, start_fourth_root_price_ratio)?,
                &exponent,
            )?,
        )?;

        // Since we're rounding current fourth root price ratio down, we only need to check the lower boundary.
        let minimum_fourth_root_price_ratio =
            std::cmp::min(start_fourth_root_price_ratio, end_fourth_root_price_ratio);
        Ok(std::cmp::max(
            *minimum_fourth_root_price_ratio,
            current_fourth_root_price_ratio,
        ))
    }
}

/// Compute centeredness
fn compute_centeredness(
    balances_scaled_18: &[U256],
    virtual_balance_a: &U256,
    virtual_balance_b: &U256,
) -> Result<(U256, bool), PoolError> {
    if balances_scaled_18[A].is_zero() {
        // Also return false if both are 0 to be consistent with the logic below.
        return Ok((U256::ZERO, false));
    } else if balances_scaled_18[B].is_zero() {
        return Ok((U256::ZERO, true));
    }

    let numerator = balances_scaled_18[A] * virtual_balance_b;
    let denominator = virtual_balance_a * balances_scaled_18[B];

    // The centeredness is defined between 0 and 1. If the numerator is greater than the denominator, we compute
    // the inverse ratio.
    if numerator <= denominator {
        let pool_centeredness = div_down_fixed(&numerator, &denominator)?;
        Ok((pool_centeredness, false))
    } else {
        let pool_centeredness = div_down_fixed(&denominator, &numerator)?;
        Ok((pool_centeredness, true))
    }
}

/// Compute invariant for ReClammV2 pool
pub fn compute_invariant(
    balances_scaled_18: &[U256],
    virtual_balance_a: &U256,
    virtual_balance_b: &U256,
    rounding: Rounding,
) -> Result<U256, PoolError> {
    match rounding {
        Rounding::RoundDown => mul_down_fixed(
            &(balances_scaled_18[A] + virtual_balance_a),
            &(balances_scaled_18[B] + virtual_balance_b),
        ),
        Rounding::RoundUp => mul_up_fixed(
            &(balances_scaled_18[A] + virtual_balance_a),
            &(balances_scaled_18[B] + virtual_balance_b),
        ),
    }
}

/// Compute output given input for ReClammV2 pool
pub fn compute_out_given_in(
    balances_scaled_18: &[U256],
    virtual_balance_a: &U256,
    virtual_balance_b: &U256,
    token_in_index: usize,
    token_out_index: usize,
    amount_in_scaled_18: &U256,
) -> Result<U256, String> {
    let (virtual_balance_token_in, virtual_balance_token_out) = if token_in_index == 0 {
        (virtual_balance_a, virtual_balance_b)
    } else {
        (virtual_balance_b, virtual_balance_a)
    };

    // Use U256 for precise division to avoid off-by-one errors
    let amount_out_scaled_18 = (balances_scaled_18[token_out_index] + virtual_balance_token_out)
        * amount_in_scaled_18
        / (balances_scaled_18[token_in_index] + virtual_balance_token_in + amount_in_scaled_18);

    if amount_out_scaled_18 > balances_scaled_18[token_out_index] {
        // Amount out cannot be greater than the real balance of the token in the pool.
        return Err("reClammMath: AmountOutGreaterThanBalance".to_string());
    }

    Ok(amount_out_scaled_18)
}

/// Compute input given output for ReClammV2 pool
pub fn compute_in_given_out(
    balances_scaled_18: &[U256],
    virtual_balance_a: &U256,
    virtual_balance_b: &U256,
    token_in_index: usize,
    token_out_index: usize,
    amount_out_scaled_18: &U256,
) -> Result<U256, String> {
    if amount_out_scaled_18 > &balances_scaled_18[token_out_index] {
        // Amount out cannot be greater than the real balance of the token in the pool.
        return Err("reClammMath: AmountOutGreaterThanBalance".to_string());
    }

    let (virtual_balance_token_in, virtual_balance_token_out) = if token_in_index == 0 {
        (virtual_balance_a, virtual_balance_b)
    } else {
        (virtual_balance_b, virtual_balance_a)
    };

    // Round up to favor the vault (i.e. request larger amount in from the user).
    let amount_in_scaled_18 = mul_div_up_fixed(
        &(balances_scaled_18[token_in_index] + virtual_balance_token_in),
        amount_out_scaled_18,
        &(balances_scaled_18[token_out_index] + virtual_balance_token_out - amount_out_scaled_18),
    )
    .map_err(|e| e.to_string())?;

    Ok(amount_in_scaled_18)
}

/// Calculate the square root of a value scaled by 18 decimals
fn sqrt_scaled_18(value_scaled_18: &U256) -> U256 {
    sqrt(&(value_scaled_18 * WAD))
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Price-range-update path: timestamps differ, price-ratio update inactive.
    fn call_updating_price_range(
        balances: [U256; 2],
        last_virtual_a: U256,
        last_virtual_b: U256,
    ) -> Result<(U256, U256, bool), PoolError> {
        let current_timestamp = U256::from(200u64);
        let last_timestamp = U256::from(100u64);
        let centeredness_margin = WAD / U256::from(2u64);
        // Inactive when end_time is 0 (last_timestamp < end is false).
        let price_ratio_update_start_time = U256::ZERO;
        let price_ratio_update_end_time = U256::ZERO;
        let fourth_root = WAD;
        let daily_price_shift_base = WAD;

        compute_current_virtual_balances(
            &current_timestamp,
            &balances,
            &last_virtual_a,
            &last_virtual_b,
            &daily_price_shift_base,
            &last_timestamp,
            &centeredness_margin,
            &fourth_root,
            &fourth_root,
            &price_ratio_update_start_time,
            &price_ratio_update_end_time,
        )
    }

    /// Price-ratio-update path: current time inside the update window.
    fn call_updating_price_ratio(
        balances: [U256; 2],
        last_virtual_a: U256,
        last_virtual_b: U256,
        fourth_root_price_ratio: U256,
    ) -> Result<(U256, U256, bool), PoolError> {
        let last_timestamp = U256::from(100u64);
        let current_timestamp = U256::from(150u64);
        let price_ratio_update_start_time = U256::from(50u64);
        let price_ratio_update_end_time = U256::from(200u64);
        // Centeredness above margin so only the price-ratio branch runs first.
        let centeredness_margin = WAD / U256::from(2u64);
        let daily_price_shift_base = WAD;

        compute_current_virtual_balances(
            &current_timestamp,
            &balances,
            &last_virtual_a,
            &last_virtual_b,
            &daily_price_shift_base,
            &last_timestamp,
            &centeredness_margin,
            &fourth_root_price_ratio,
            &fourth_root_price_ratio,
            &price_ratio_update_start_time,
            &price_ratio_update_end_time,
        )
    }

    #[test]
    fn virtual_balances_err_zero_invariant_skewed_a() {
        let result = call_updating_price_range(
            [U256::from(100_000_000u64), U256::from(1u64)],
            U256::from(100_000_000u64),
            U256::from(100_000_000u64),
        );
        assert!(matches!(result, Err(PoolError::ZeroInvariant)));
    }

    #[test]
    fn virtual_balances_err_zero_invariant_skewed_b() {
        let result = call_updating_price_range(
            [U256::from(1u64), U256::from(100_000_000u64)],
            U256::from(100_000_000u64),
            U256::from(100_000_000u64),
        );
        assert!(matches!(result, Err(PoolError::ZeroInvariant)));
    }

    #[test]
    fn virtual_balances_err_zero_invariant_mild_skew() {
        let result = call_updating_price_range(
            [U256::from(1_000_000u64), U256::from(1u64)],
            U256::from(1_000_000u64),
            U256::from(1_000_000u64),
        );
        assert!(matches!(result, Err(PoolError::ZeroInvariant)));
    }

    #[test]
    fn virtual_balances_control_unit_balances_ok() {
        let result = call_updating_price_range(
            [U256::from(1u64), U256::from(1u64)],
            U256::from(1u64),
            U256::from(1u64),
        );
        assert!(result.is_ok());
    }

    #[test]
    fn virtual_balances_err_price_ratio_update_when_sqrt_equals_wad() {
        // fourth_root = WAD ⇒ sqrt_price_ratio = WAD ⇒ (sqrt_price_ratio - WAD) = 0.
        let result = call_updating_price_ratio([WAD, WAD], WAD, WAD, WAD);
        assert!(matches!(result, Err(PoolError::ZeroInvariant)));
    }

    #[test]
    fn compute_centeredness_ok_when_balances_nonzero() {
        let balances = [WAD, WAD];
        let result = compute_centeredness(&balances, &WAD, &WAD);
        assert!(result.is_ok());
        let (centeredness, _) = result.unwrap();
        assert_eq!(centeredness, WAD);
    }

    #[test]
    fn compute_centeredness_zero_balance_a() {
        let balances = [U256::ZERO, WAD];
        let result = compute_centeredness(&balances, &WAD, &WAD).unwrap();
        assert_eq!(result, (U256::ZERO, false));
    }

    #[test]
    fn compute_fourth_root_price_ratio_at_end_returns_end() {
        let start = WAD;
        let end = WAD * U256::from(2u64);
        let result = compute_fourth_root_price_ratio(
            &U256::from(200u64),
            &start,
            &end,
            &U256::from(50u64),
            &U256::from(200u64),
        )
        .unwrap();
        assert_eq!(result, end);
    }

    #[test]
    fn compute_fourth_root_price_ratio_before_start_returns_start() {
        let start = WAD;
        let end = WAD * U256::from(2u64);
        let result = compute_fourth_root_price_ratio(
            &U256::from(10u64),
            &start,
            &end,
            &U256::from(50u64),
            &U256::from(200u64),
        )
        .unwrap();
        assert_eq!(result, start);
    }

    #[test]
    fn compute_fourth_root_price_ratio_mid_window_ok() {
        let start = WAD;
        let end = WAD; // same start/end so pow base is 1
        let result = compute_fourth_root_price_ratio(
            &U256::from(100u64),
            &start,
            &end,
            &U256::from(50u64),
            &U256::from(200u64),
        );
        assert!(result.is_ok());
    }

    #[test]
    fn compute_invariant_propagates_overflow() {
        let balances = [U256::MAX, U256::MAX];
        let result = compute_invariant(&balances, &U256::MAX, &U256::MAX, Rounding::RoundDown);
        assert!(matches!(result, Err(PoolError::MathOverflow)));
    }
}

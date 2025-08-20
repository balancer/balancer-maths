use crate::common::constants::{RAY, TWO_WAD, WAD};
use crate::common::log_exp_math;
use crate::common::maths::{
    div_down_fixed, div_up_fixed, mul_div_up_fixed, mul_down_fixed, mul_up_fixed, pow_down_fixed,
};
use crate::common::oz_math::sqrt;
use crate::common::types::Rounding;
use num_bigint::BigInt;
use num_traits::Zero;

// Constants
const A: usize = 0;
const B: usize = 1;
lazy_static::lazy_static! {
    static ref THIRTY_DAYS_SECONDS: BigInt = BigInt::from(30 * 24 * 60 * 60u64); // 2,592,000 seconds
}

/// Compute current virtual balances for ReClammV2 pool
#[allow(clippy::too_many_arguments)]
pub fn compute_current_virtual_balances(
    current_timestamp: &BigInt,
    balances_scaled_18: &[BigInt],
    last_virtual_balance_a: &BigInt,
    last_virtual_balance_b: &BigInt,
    daily_price_shift_base: &BigInt,
    last_timestamp: &BigInt,
    centeredness_margin: &BigInt,
    start_fourth_root_price_ratio: &BigInt,
    end_fourth_root_price_ratio: &BigInt,
    price_ratio_update_start_time: &BigInt,
    price_ratio_update_end_time: &BigInt,
) -> (BigInt, BigInt, bool) {
    if last_timestamp == current_timestamp {
        return (
            last_virtual_balance_a.clone(),
            last_virtual_balance_b.clone(),
            false,
        );
    }

    let mut current_virtual_balance_a = last_virtual_balance_a.clone();
    let mut current_virtual_balance_b = last_virtual_balance_b.clone();

    let current_fourth_root_price_ratio = compute_fourth_root_price_ratio(
        current_timestamp,
        start_fourth_root_price_ratio,
        end_fourth_root_price_ratio,
        price_ratio_update_start_time,
        price_ratio_update_end_time,
    );

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
            );

        current_virtual_balance_a = new_virtual_balance_a;
        current_virtual_balance_b = new_virtual_balance_b;
        changed = true;
    }

    let (centeredness, is_pool_above_center) = compute_centeredness(
        balances_scaled_18,
        &current_virtual_balance_a,
        &current_virtual_balance_b,
    );

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
            );

        current_virtual_balance_a = new_virtual_balance_a;
        current_virtual_balance_b = new_virtual_balance_b;
        changed = true;
    }

    (
        current_virtual_balance_a,
        current_virtual_balance_b,
        changed,
    )
}

/// Compute virtual balances when updating price ratio
fn compute_virtual_balances_updating_price_ratio(
    current_fourth_root_price_ratio: &BigInt,
    balances_scaled_18: &[BigInt],
    last_virtual_balance_a: &BigInt,
    last_virtual_balance_b: &BigInt,
) -> (BigInt, BigInt) {
    // Compute the current pool centeredness, which will remain constant.
    let (centeredness, is_pool_above_center) = compute_centeredness(
        balances_scaled_18,
        last_virtual_balance_a,
        last_virtual_balance_b,
    );

    // The overvalued token is the one with a lower token balance (therefore, rarer and more valuable).
    let (
        balance_token_undervalued,
        last_virtual_balance_undervalued,
        last_virtual_balance_overvalued,
    ) = if is_pool_above_center {
        (
            balances_scaled_18[A].clone(),
            last_virtual_balance_a.clone(),
            last_virtual_balance_b.clone(),
        )
    } else {
        (
            balances_scaled_18[B].clone(),
            last_virtual_balance_b.clone(),
            last_virtual_balance_a.clone(),
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
    )
    .unwrap_or_else(|_| BigInt::zero());

    // Using FixedPoint math as little as possible to improve the precision of the result.
    // Note: The input of sqrt must be a 36-decimal number, so that the final result is 18 decimals.
    let sqrt_input = &centeredness * (&centeredness + &(4 * &sqrt_price_ratio) - &*TWO_WAD) + &*RAY;
    let sqrt_result = sqrt(&sqrt_input);

    let virtual_balance_undervalued = balance_token_undervalued
        * (&*WAD + &centeredness + &sqrt_result)
        / &(2 * (&sqrt_price_ratio - &*WAD));

    let virtual_balance_overvalued = &virtual_balance_undervalued
        * &last_virtual_balance_overvalued
        / &last_virtual_balance_undervalued;

    if is_pool_above_center {
        (virtual_balance_undervalued, virtual_balance_overvalued)
    } else {
        (virtual_balance_overvalued, virtual_balance_undervalued)
    }
}

/// Compute virtual balances when updating price range
fn compute_virtual_balances_updating_price_range(
    balances_scaled_18: &[BigInt],
    virtual_balance_a: &BigInt,
    virtual_balance_b: &BigInt,
    is_pool_above_center: bool,
    daily_price_shift_base: &BigInt,
    current_timestamp: &BigInt,
    last_timestamp: &BigInt,
) -> (BigInt, BigInt) {
    let sqrt_price_ratio = sqrt_scaled_18(&compute_price_ratio(
        balances_scaled_18,
        virtual_balance_a,
        virtual_balance_b,
    ));

    // The overvalued token is the one with a lower token balance (therefore, rarer and more valuable).
    let (
        balances_scaled_undervalued,
        balances_scaled_overvalued,
        _virtual_balance_undervalued,
        virtual_balance_overvalued,
    ) = if is_pool_above_center {
        (
            balances_scaled_18[0].clone(),
            balances_scaled_18[1].clone(),
            virtual_balance_a.clone(),
            virtual_balance_b.clone(),
        )
    } else {
        (
            balances_scaled_18[1].clone(),
            balances_scaled_18[0].clone(),
            virtual_balance_b.clone(),
            virtual_balance_a.clone(),
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
        current_timestamp - last_timestamp,
        THIRTY_DAYS_SECONDS.clone(),
    );

    let mut virtual_balance_overvalued = mul_down_fixed(
        &virtual_balance_overvalued,
        &pow_down_fixed(daily_price_shift_base, &(duration * &*WAD))
            .unwrap_or_else(|_| WAD.clone()),
    )
    .unwrap_or_else(|_| BigInt::zero());

    // Ensure that Vo does not go below the minimum allowed value (corresponding to centeredness == 1).
    let min_virtual_balance_overvalued = div_down_fixed(
        &balances_scaled_overvalued,
        &(sqrt_scaled_18(&sqrt_price_ratio) - &*WAD),
    )
    .unwrap_or_else(|_| BigInt::zero());

    if virtual_balance_overvalued < min_virtual_balance_overvalued {
        virtual_balance_overvalued = min_virtual_balance_overvalued;
    }

    let virtual_balance_undervalued = &balances_scaled_undervalued
        * &(&virtual_balance_overvalued + &balances_scaled_overvalued)
        / &(mul_down_fixed(&(sqrt_price_ratio - &*WAD), &virtual_balance_overvalued)
            .unwrap_or_else(|_| BigInt::zero())
            - &balances_scaled_overvalued);

    if is_pool_above_center {
        (virtual_balance_undervalued, virtual_balance_overvalued)
    } else {
        (virtual_balance_overvalued, virtual_balance_undervalued)
    }
}

/// Compute price ratio
fn compute_price_ratio(
    balances_scaled_18: &[BigInt],
    virtual_balance_a: &BigInt,
    virtual_balance_b: &BigInt,
) -> BigInt {
    let (min_price, max_price) =
        compute_price_range(balances_scaled_18, virtual_balance_a, virtual_balance_b);

    div_up_fixed(&max_price, &min_price).unwrap_or_else(|_| BigInt::zero())
}

/// Compute price range
fn compute_price_range(
    balances_scaled_18: &[BigInt],
    virtual_balance_a: &BigInt,
    virtual_balance_b: &BigInt,
) -> (BigInt, BigInt) {
    let current_invariant = compute_invariant(
        balances_scaled_18,
        virtual_balance_a,
        virtual_balance_b,
        Rounding::RoundDown,
    );

    // P_min(a) = Vb / (Va + Ra_max)
    // We don't have Ra_max, but: invariant=(Ra_max + Va)(Vb)
    // Then, (Va + Ra_max) = invariant/Vb, and:
    // P_min(a) = Vb^2 / invariant
    let min_price = virtual_balance_b * virtual_balance_b / &current_invariant;

    // Similarly, P_max(a) = (Rb_max + Vb)/Va
    // We don't have Rb_max, but: invariant=(Rb_max + Vb)(Va)
    // Then, (Rb_max + Vb) = invariant/Va, and:
    // P_max(a) = invariant / Va^2
    let max_price = div_down_fixed(
        &current_invariant,
        &mul_down_fixed(virtual_balance_a, virtual_balance_a).unwrap_or_else(|_| BigInt::zero()),
    )
    .unwrap_or_else(|_| BigInt::zero());

    (min_price, max_price)
}

/// Compute fourth root price ratio
fn compute_fourth_root_price_ratio(
    current_time: &BigInt,
    start_fourth_root_price_ratio: &BigInt,
    end_fourth_root_price_ratio: &BigInt,
    price_ratio_update_start_time: &BigInt,
    price_ratio_update_end_time: &BigInt,
) -> BigInt {
    // if start and end time are the same, return end value.
    if current_time >= price_ratio_update_end_time {
        end_fourth_root_price_ratio.clone()
    } else if current_time <= price_ratio_update_start_time {
        start_fourth_root_price_ratio.clone()
    } else {
        let exponent = div_down_fixed(
            &(current_time - price_ratio_update_start_time),
            &(price_ratio_update_end_time - price_ratio_update_start_time),
        )
        .unwrap_or_else(|_| BigInt::zero());

        let current_fourth_root_price_ratio = mul_down_fixed(
            start_fourth_root_price_ratio,
            &log_exp_math::pow(
                &div_down_fixed(end_fourth_root_price_ratio, start_fourth_root_price_ratio)
                    .unwrap_or_else(|_| BigInt::zero()),
                &exponent,
            )
            .unwrap_or_else(|_| WAD.clone()),
        )
        .unwrap_or_else(|_| BigInt::zero());

        // Since we're rounding current fourth root price ratio down, we only need to check the lower boundary.
        let minimum_fourth_root_price_ratio =
            std::cmp::min(start_fourth_root_price_ratio, end_fourth_root_price_ratio);
        std::cmp::max(
            minimum_fourth_root_price_ratio.clone(),
            current_fourth_root_price_ratio,
        )
    }
}

/// Compute centeredness
fn compute_centeredness(
    balances_scaled_18: &[BigInt],
    virtual_balance_a: &BigInt,
    virtual_balance_b: &BigInt,
) -> (BigInt, bool) {
    if balances_scaled_18[A].is_zero() {
        // Also return false if both are 0 to be consistent with the logic below.
        return (BigInt::zero(), false);
    } else if balances_scaled_18[B].is_zero() {
        return (BigInt::zero(), true);
    }

    let numerator = &balances_scaled_18[A] * virtual_balance_b;
    let denominator = virtual_balance_a * &balances_scaled_18[B];

    // The centeredness is defined between 0 and 1. If the numerator is greater than the denominator, we compute
    // the inverse ratio.
    if numerator <= denominator {
        let pool_centeredness =
            div_down_fixed(&numerator, &denominator).unwrap_or_else(|_| BigInt::zero());
        let is_pool_above_center = false;
        (pool_centeredness, is_pool_above_center)
    } else {
        let pool_centeredness =
            div_down_fixed(&denominator, &numerator).unwrap_or_else(|_| BigInt::zero());
        let is_pool_above_center = true;
        (pool_centeredness, is_pool_above_center)
    }
}

/// Compute invariant for ReClammV2 pool
pub fn compute_invariant(
    balances_scaled_18: &[BigInt],
    virtual_balance_a: &BigInt,
    virtual_balance_b: &BigInt,
    rounding: Rounding,
) -> BigInt {
    match rounding {
        Rounding::RoundDown => mul_down_fixed(
            &(balances_scaled_18[A].clone() + virtual_balance_a),
            &(balances_scaled_18[B].clone() + virtual_balance_b),
        )
        .unwrap_or_else(|_| BigInt::zero()),
        Rounding::RoundUp => mul_up_fixed(
            &(balances_scaled_18[A].clone() + virtual_balance_a),
            &(balances_scaled_18[B].clone() + virtual_balance_b),
        )
        .unwrap_or_else(|_| BigInt::zero()),
    }
}

/// Compute output given input for ReClammV2 pool
pub fn compute_out_given_in(
    balances_scaled_18: &[BigInt],
    virtual_balance_a: &BigInt,
    virtual_balance_b: &BigInt,
    token_in_index: usize,
    token_out_index: usize,
    amount_in_scaled_18: &BigInt,
) -> Result<BigInt, String> {
    let (virtual_balance_token_in, virtual_balance_token_out) = if token_in_index == 0 {
        (virtual_balance_a, virtual_balance_b)
    } else {
        (virtual_balance_b, virtual_balance_a)
    };

    // Use BigInt for precise division to avoid off-by-one errors
    let amount_out_scaled_18 = &(&balances_scaled_18[token_out_index] + virtual_balance_token_out)
        * amount_in_scaled_18
        / &(&balances_scaled_18[token_in_index] + virtual_balance_token_in + amount_in_scaled_18);

    if amount_out_scaled_18 > balances_scaled_18[token_out_index] {
        // Amount out cannot be greater than the real balance of the token in the pool.
        return Err("reClammMath: AmountOutGreaterThanBalance".to_string());
    }

    Ok(amount_out_scaled_18)
}

/// Compute input given output for ReClammV2 pool
pub fn compute_in_given_out(
    balances_scaled_18: &[BigInt],
    virtual_balance_a: &BigInt,
    virtual_balance_b: &BigInt,
    token_in_index: usize,
    token_out_index: usize,
    amount_out_scaled_18: &BigInt,
) -> Result<BigInt, String> {
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
        &(&balances_scaled_18[token_in_index] + virtual_balance_token_in),
        amount_out_scaled_18,
        &(&balances_scaled_18[token_out_index] + virtual_balance_token_out - amount_out_scaled_18),
    )
    .unwrap_or_else(|_| BigInt::zero());

    Ok(amount_in_scaled_18)
}

/// Calculate the square root of a value scaled by 18 decimals
fn sqrt_scaled_18(value_scaled_18: &BigInt) -> BigInt {
    sqrt(&(value_scaled_18 * &*WAD))
}

use crate::common::constants::TWO_WAD;
use crate::common::log_exp_math::pow;
use crate::common::maths::{div_down_fixed, div_up_fixed, mul_down_fixed, mul_up_fixed};
use crate::common::oz_math::sqrt;
use crate::common::types::Rounding;
use crate::common::WAD;
use num_bigint::BigInt;
use num_traits::Zero;
use std::str::FromStr;

// Constants
const A: usize = 0;
const B: usize = 1;
lazy_static::lazy_static! {
    static ref INITIALIZATION_MAX_BALANCE_A: BigInt = BigInt::from(1_000_000u64) * WAD.clone();
    // RAY constant for 36 decimal precision
    static ref RAY: BigInt = BigInt::from_str("1000000000000000000000000000000000000").unwrap();
}

/// Compute current virtual balances for ReClamm pool
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
            calculate_virtual_balances_updating_price_ratio(
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

/// Calculate virtual balances when updating price ratio using Bhaskara formula
fn calculate_virtual_balances_updating_price_ratio(
    current_fourth_root_price_ratio: &BigInt,
    balances_scaled_18: &[BigInt],
    last_virtual_balance_a: &BigInt,
    last_virtual_balance_b: &BigInt,
) -> (BigInt, BigInt) {
    // Compute the current pool centeredness, which will remain constant.
    let (pool_centeredness, is_pool_above_center) = compute_centeredness(
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
            &balances_scaled_18[A],
            last_virtual_balance_a,
            last_virtual_balance_b,
        )
    } else {
        (
            &balances_scaled_18[B],
            last_virtual_balance_b,
            last_virtual_balance_a,
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
    let sqrt_input =
        &pool_centeredness * (&pool_centeredness + &(4 * &sqrt_price_ratio) - &*TWO_WAD) + &*RAY;
    let sqrt_result = sqrt(&sqrt_input);

    let virtual_balance_undervalued = balance_token_undervalued
        * (&*WAD + &pool_centeredness + &sqrt_result)
        / &(2 * (&sqrt_price_ratio - &*WAD));

    let virtual_balance_overvalued = (&virtual_balance_undervalued
        * last_virtual_balance_overvalued)
        / last_virtual_balance_undervalued;

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
    let sqrt_price_ratio = sqrt(
        &(&compute_price_ratio(balances_scaled_18, virtual_balance_a, virtual_balance_b) * &*WAD),
    );

    let (balances_scaled_undervalued, balances_scaled_overvalued) = if is_pool_above_center {
        (&balances_scaled_18[A], &balances_scaled_18[B])
    } else {
        (&balances_scaled_18[B], &balances_scaled_18[A])
    };

    let (_virtual_balance_undervalued, virtual_balance_overvalued) = if is_pool_above_center {
        (virtual_balance_a, virtual_balance_b)
    } else {
        (virtual_balance_b, virtual_balance_a)
    };

    // Vb = Vb * (dailyPriceShiftBase)^(T_curr - T_last)
    let time_difference = current_timestamp - last_timestamp;
    let time_difference_wad = &time_difference * &*WAD;

    let shift_factor =
        pow(daily_price_shift_base, &time_difference_wad).unwrap_or_else(|_| WAD.clone());
    let virtual_balance_overvalued = mul_down_fixed(virtual_balance_overvalued, &shift_factor)
        .unwrap_or_else(|_| BigInt::zero());

    // Va = (Ra * (Vb + Rb)) / (((priceRatio - 1) * Vb) - Rb)
    let price_ratio_minus_one = &sqrt_price_ratio - &*WAD;
    let denominator = mul_down_fixed(&price_ratio_minus_one, &virtual_balance_overvalued)
        .unwrap_or_else(|_| BigInt::zero())
        - balances_scaled_overvalued;

    let virtual_balance_undervalued = (balances_scaled_undervalued
        * (&virtual_balance_overvalued + balances_scaled_overvalued))
        / &denominator;

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
    let invariant = compute_invariant(
        balances_scaled_18,
        virtual_balance_a,
        virtual_balance_b,
        Rounding::RoundDown,
    );

    // P_min(a) = Vb^2 / invariant
    let min_price = (virtual_balance_b * virtual_balance_b) / &invariant;

    // P_max(a) = invariant / Va^2
    let max_price = div_down_fixed(
        &invariant,
        &mul_down_fixed(virtual_balance_a, virtual_balance_a).unwrap_or_else(|_| BigInt::zero()),
    )
    .unwrap_or_else(|_| BigInt::zero());

    (min_price, max_price)
}

/// Compute fourth root price ratio
fn compute_fourth_root_price_ratio(
    current_timestamp: &BigInt,
    start_fourth_root_price_ratio: &BigInt,
    end_fourth_root_price_ratio: &BigInt,
    price_ratio_update_start_time: &BigInt,
    price_ratio_update_end_time: &BigInt,
) -> BigInt {
    if current_timestamp >= price_ratio_update_end_time {
        return end_fourth_root_price_ratio.clone();
    } else if current_timestamp <= price_ratio_update_start_time {
        return start_fourth_root_price_ratio.clone();
    }

    let exponent = div_down_fixed(
        &(current_timestamp - price_ratio_update_start_time),
        &(price_ratio_update_end_time - price_ratio_update_start_time),
    )
    .unwrap_or_else(|_| BigInt::zero());

    let current_fourth_root_price_ratio = mul_down_fixed(
        start_fourth_root_price_ratio,
        &pow(
            &div_down_fixed(end_fourth_root_price_ratio, start_fourth_root_price_ratio)
                .unwrap_or_else(|_| BigInt::zero()),
            &exponent,
        )
        .unwrap_or_else(|_| BigInt::zero()),
    )
    .unwrap_or_else(|_| BigInt::zero());

    // Since we're rounding current fourth root price ratio down, we only need to check the lower boundary.
    let minimum_fourth_root_price_ratio =
        if start_fourth_root_price_ratio < end_fourth_root_price_ratio {
            start_fourth_root_price_ratio.clone()
        } else {
            end_fourth_root_price_ratio.clone()
        };

    if current_fourth_root_price_ratio > minimum_fourth_root_price_ratio {
        current_fourth_root_price_ratio
    } else {
        minimum_fourth_root_price_ratio
    }
}

/// Compute centeredness of the pool
fn compute_centeredness(
    balances_scaled_18: &[BigInt],
    virtual_balance_a: &BigInt,
    virtual_balance_b: &BigInt,
) -> (BigInt, bool) {
    if balances_scaled_18[A] == BigInt::zero() {
        // Also return false if both are 0 to be consistent with the logic below.
        return (BigInt::zero(), false);
    } else if balances_scaled_18[B] == BigInt::zero() {
        return (BigInt::zero(), true);
    }

    let numerator = &balances_scaled_18[A] * virtual_balance_b;
    let denominator = virtual_balance_a * &balances_scaled_18[B];

    // The centeredness is defined between 0 and 1. If the numerator is greater than the denominator,
    // we compute the inverse ratio.
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

/// Compute invariant for ReClamm pool
pub fn compute_invariant(
    balances_scaled_18: &[BigInt],
    virtual_balance_a: &BigInt,
    virtual_balance_b: &BigInt,
    rounding: Rounding,
) -> BigInt {
    let total_balance_a = &balances_scaled_18[A] + virtual_balance_a;
    let total_balance_b = &balances_scaled_18[B] + virtual_balance_b;

    match rounding {
        Rounding::RoundDown => {
            mul_down_fixed(&total_balance_a, &total_balance_b).unwrap_or_else(|_| BigInt::zero())
        }
        Rounding::RoundUp => {
            mul_up_fixed(&total_balance_a, &total_balance_b).unwrap_or_else(|_| BigInt::zero())
        }
    }
}

/// Compute output given input for ReClamm pool
pub fn compute_out_given_in(
    balances_scaled_18: &[BigInt],
    virtual_balance_a: &BigInt,
    virtual_balance_b: &BigInt,
    token_in_index: usize,
    token_out_index: usize,
    amount_given_scaled_18: &BigInt,
) -> Result<BigInt, String> {
    let (virtual_balance_token_in, virtual_balance_token_out) = if token_in_index == 0 {
        (virtual_balance_a, virtual_balance_b)
    } else {
        (virtual_balance_b, virtual_balance_a)
    };

    // Round up, so the swapper absorbs rounding imprecisions
    let invariant = compute_invariant(
        balances_scaled_18,
        virtual_balance_a,
        virtual_balance_b,
        Rounding::RoundUp,
    );

    // Total (virtual + real) token out amount that should stay in the pool after the swap
    let new_total_token_out_pool_balance = div_up_fixed(
        &invariant,
        &(&balances_scaled_18[token_in_index] + virtual_balance_token_in + amount_given_scaled_18),
    )
    .unwrap_or_else(|_| BigInt::zero());

    let current_total_token_out_pool_balance =
        &balances_scaled_18[token_out_index] + virtual_balance_token_out;

    if new_total_token_out_pool_balance > current_total_token_out_pool_balance {
        return Err("reClammMath: NegativeAmountOut".to_string());
    }

    let amount_out_scaled_18 =
        current_total_token_out_pool_balance - new_total_token_out_pool_balance;
    if amount_out_scaled_18 > balances_scaled_18[token_out_index] {
        return Err("reClammMath: AmountOutGreaterThanBalance".to_string());
    }

    Ok(amount_out_scaled_18)
}

/// Compute input given output for ReClamm pool
pub fn compute_in_given_out(
    balances_scaled_18: &[BigInt],
    virtual_balance_a: &BigInt,
    virtual_balance_b: &BigInt,
    token_in_index: usize,
    token_out_index: usize,
    amount_out_scaled_18: &BigInt,
) -> Result<BigInt, String> {
    if amount_out_scaled_18 > &balances_scaled_18[token_out_index] {
        return Err("reClammMath: AmountOutGreaterThanBalance".to_string());
    }

    // Round up, so the swapper absorbs any imprecision due to rounding
    let invariant = compute_invariant(
        balances_scaled_18,
        virtual_balance_a,
        virtual_balance_b,
        Rounding::RoundUp,
    );

    let (virtual_balance_token_in, virtual_balance_token_out) = if token_in_index == 0 {
        (virtual_balance_a, virtual_balance_b)
    } else {
        (virtual_balance_b, virtual_balance_a)
    };

    // Rounding division up, which will round the `tokenIn` amount up, favoring the Vault
    let amount_in_scaled_18 = div_up_fixed(
        &invariant,
        &(&balances_scaled_18[token_out_index] + virtual_balance_token_out - amount_out_scaled_18),
    )
    .unwrap_or_else(|_| BigInt::zero())
        - &balances_scaled_18[token_in_index]
        - virtual_balance_token_in;

    Ok(amount_in_scaled_18)
}

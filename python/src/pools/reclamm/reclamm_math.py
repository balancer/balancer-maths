from typing import List, Tuple

from src.common.constants import RAY, TWO_WAD, WAD
from src.common.log_exp_math import LogExpMath
from src.common.maths import (
    Rounding,
    div_down_fixed,
    div_up_fixed,
    mul_down_fixed,
    mul_up_fixed,
)
from src.common.oz_math import sqrt

# Constants
A = 0
B = 1
INITIALIZATION_MAX_BALANCE_A = 1_000_000 * WAD


def compute_current_virtual_balances(
    current_timestamp: int,
    balances_scaled_18: List[int],
    last_virtual_balance_a: int,
    last_virtual_balance_b: int,
    daily_price_shift_base: int,
    last_timestamp: int,
    centeredness_margin: int,
    start_fourth_root_price_ratio: int,
    end_fourth_root_price_ratio: int,
    price_ratio_update_start_time: int,
    price_ratio_update_end_time: int,
) -> Tuple[int, int, bool]:
    if last_timestamp == current_timestamp:
        return last_virtual_balance_a, last_virtual_balance_b, False

    current_virtual_balance_a = last_virtual_balance_a
    current_virtual_balance_b = last_virtual_balance_b

    current_fourth_root_price_ratio = compute_fourth_root_price_ratio(
        current_timestamp,
        start_fourth_root_price_ratio,
        end_fourth_root_price_ratio,
        price_ratio_update_start_time,
        price_ratio_update_end_time,
    )

    changed = False

    # If the price ratio is updating, shrink/expand the price interval by recalculating the virtual balances.
    if (
        current_timestamp > price_ratio_update_start_time
        and last_timestamp < price_ratio_update_end_time
    ):
        current_virtual_balance_a, current_virtual_balance_b = (
            calculate_virtual_balances_updating_price_ratio(
                current_fourth_root_price_ratio,
                balances_scaled_18,
                last_virtual_balance_a,
                last_virtual_balance_b,
            )
        )

        changed = True

    centeredness, is_pool_above_center = compute_centeredness(
        balances_scaled_18,
        current_virtual_balance_a,
        current_virtual_balance_b,
    )

    # If the pool is outside the target range, track the market price by moving the price interval.
    if centeredness < centeredness_margin:
        current_virtual_balance_a, current_virtual_balance_b = (
            compute_virtual_balances_updating_price_range(
                balances_scaled_18,
                current_virtual_balance_a,
                current_virtual_balance_b,
                is_pool_above_center,
                daily_price_shift_base,
                current_timestamp,
                last_timestamp,
            )
        )

        changed = True

    return current_virtual_balance_a, current_virtual_balance_b, changed


def calculate_virtual_balances_updating_price_ratio(
    current_fourth_root_price_ratio: int,
    balances_scaled_18: List[int],
    last_virtual_balance_a: int,
    last_virtual_balance_b: int,
) -> Tuple[int, int]:
    """
    @notice Compute the virtual balances of the pool when the price ratio is updating.
    @dev This function uses a Bhaskara formula to shrink/expand the price interval by recalculating the virtual
    balances. It'll keep the pool centeredness constant, and track the desired price ratio. To derive this formula,
    we need to solve the following simultaneous equations:

    1. centeredness = (Ra * Vb) / (Rb * Va)
    2. PriceRatio = invariant^2/(Va * Vb)^2 (maxPrice / minPrice)
    3. invariant = (Va + Ra) * (Vb + Rb)

    Substitute [3] in [2]. Then, isolate one of the V's. Finally, replace the isolated V in [1]. We get a quadratic
    equation that will be solved in this function.

    @param current_fourth_root_price_ratio The current fourth root of the price ratio of the pool
    @param balances_scaled_18 Current pool balances, sorted in token registration order
    @param last_virtual_balance_a The last virtual balance of token A
    @param last_virtual_balance_b The last virtual balance of token B
    @return virtual_balance_a The virtual balance of token A
    @return virtual_balance_b The virtual balance of token B
    """
    # Compute the current pool centeredness, which will remain constant.
    pool_centeredness, is_pool_above_center = compute_centeredness(
        balances_scaled_18,
        last_virtual_balance_a,
        last_virtual_balance_b,
    )

    # The overvalued token is the one with a lower token balance (therefore, rarer and more valuable).
    if is_pool_above_center:
        balance_token_undervalued = balances_scaled_18[0]
        last_virtual_balance_undervalued = last_virtual_balance_a
        last_virtual_balance_overvalued = last_virtual_balance_b
    else:
        balance_token_undervalued = balances_scaled_18[1]
        last_virtual_balance_undervalued = last_virtual_balance_b
        last_virtual_balance_overvalued = last_virtual_balance_a

    # The original formula was a quadratic equation, with terms:
    # a = Q0 - 1
    # b = - Ru (1 + C)
    # c = - Ru^2 C
    # where Q0 is the square root of the price ratio, Ru is the undervalued token balance, and C is the
    # centeredness. Applying Bhaskara, we'd have: Vu = (-b + sqrt(b^2 - 4ac)) / 2a.
    # The Bhaskara above can be simplified by replacing a, b and c with the terms above, which leads to:
    # Vu = Ru(1 + C + sqrt(1 + C (C + 4 Q0 - 2))) / 2(Q0 - 1)
    sqrt_price_ratio = mul_down_fixed(
        current_fourth_root_price_ratio,
        current_fourth_root_price_ratio,
    )

    # Using FixedPoint math as little as possible to improve the precision of the result.
    # Note: The input of sqrt must be a 36-decimal number, so that the final result is 18 decimals.
    virtual_balance_undervalued = (
        balance_token_undervalued
        * (
            WAD
            + pool_centeredness
            + sqrt(
                pool_centeredness * (pool_centeredness + 4 * sqrt_price_ratio - TWO_WAD)
                + RAY
            )
        )
    ) // (2 * (sqrt_price_ratio - WAD))

    virtual_balance_overvalued = (
        virtual_balance_undervalued * last_virtual_balance_overvalued
    ) // last_virtual_balance_undervalued

    if is_pool_above_center:
        virtual_balance_a = virtual_balance_undervalued
        virtual_balance_b = virtual_balance_overvalued
    else:
        virtual_balance_a = virtual_balance_overvalued
        virtual_balance_b = virtual_balance_undervalued

    return virtual_balance_a, virtual_balance_b


def compute_virtual_balances_updating_price_range(
    balances_scaled_18: List[int],
    virtual_balance_a: int,
    virtual_balance_b: int,
    is_pool_above_center: bool,
    daily_price_shift_base: int,
    current_timestamp: int,
    last_timestamp: int,
) -> Tuple[int, int]:
    """
    @notice Compute the virtual balances of the pool when updating the price range.
    @dev This function updates the virtual balances to track the market price by moving the price interval.
    """
    sqrt_price_ratio = sqrt(
        compute_price_ratio(balances_scaled_18, virtual_balance_a, virtual_balance_b)
        * WAD
    )

    # The overvalued token is the one with a lower token balance (therefore, rarer and more valuable).
    balances_scaled_undervalued, balances_scaled_overvalued = (
        (balances_scaled_18[0], balances_scaled_18[1])
        if is_pool_above_center
        else (balances_scaled_18[1], balances_scaled_18[0])
    )
    virtual_balance_undervalued, virtual_balance_overvalued = (
        (virtual_balance_a, virtual_balance_b)
        if is_pool_above_center
        else (virtual_balance_b, virtual_balance_a)
    )

    # Vb = Vb * (1 - tau)^(T_curr - T_last)
    # Vb = Vb * (dailyPriceShiftBase)^(T_curr - T_last)
    virtual_balance_overvalued = mul_down_fixed(
        virtual_balance_overvalued,
        LogExpMath.pow(
            daily_price_shift_base,
            (current_timestamp - last_timestamp) * WAD,
        ),
    )

    # Va = (Ra * (Vb + Rb)) / (((priceRatio - 1) * Vb) - Rb)
    virtual_balance_undervalued = (
        balances_scaled_undervalued
        * (virtual_balance_overvalued + balances_scaled_overvalued)
    ) // (
        mul_down_fixed(sqrt_price_ratio - WAD, virtual_balance_overvalued)
        - balances_scaled_overvalued
    )

    return (
        (virtual_balance_undervalued, virtual_balance_overvalued)
        if is_pool_above_center
        else (virtual_balance_overvalued, virtual_balance_undervalued)
    )


def compute_price_ratio(
    balances_scaled_18: List[int],
    virtual_balance_a: int,
    virtual_balance_b: int,
) -> int:
    """
    @notice Compute the price ratio of the pool by dividing the maximum price by the minimum price.
    @dev The price ratio is calculated as maxPrice/minPrice, where maxPrice and minPrice are obtained
    from computePriceRange.

    @param balances_scaled_18 Current pool balances, sorted in token registration order
    @param virtual_balance_a Virtual balance of token A
    @param virtual_balance_b Virtual balance of token B
    @return price_ratio The ratio between the maximum and minimum prices of the pool
    """
    min_price, max_price = compute_price_range(
        balances_scaled_18,
        virtual_balance_a,
        virtual_balance_b,
    )

    return div_up_fixed(max_price, min_price)


def compute_price_range(
    balances_scaled_18: List[int],
    virtual_balance_a: int,
    virtual_balance_b: int,
) -> Tuple[int, int]:
    """
    @notice Compute the minimum and maximum prices for the pool based on virtual balances and current invariant.
    @dev The prices are calculated using the invariant and virtual balances to determine the price range.
    P_min(a) = Vb^2 / invariant
    P_max(a) = invariant / Va^2

    @param balances_scaled_18 Current pool balances, sorted in token registration order
    @param virtual_balance_a Virtual balance of token A
    @param virtual_balance_b Virtual balance of token B
    @return min_price The minimum price of the pool
    @return max_price The maximum price of the pool
    """
    invariant = compute_invariant(
        balances_scaled_18,
        virtual_balance_a,
        virtual_balance_b,
        Rounding.ROUND_DOWN,
    )

    # P_min(a) = Vb^2 / invariant
    min_price = (virtual_balance_b * virtual_balance_b) // invariant

    # P_max(a) = invariant / Va^2
    max_price = div_down_fixed(
        invariant,
        mul_down_fixed(virtual_balance_a, virtual_balance_a),
    )

    return min_price, max_price


def compute_fourth_root_price_ratio(
    current_time: int,
    start_fourth_root_price_ratio: int,
    end_fourth_root_price_ratio: int,
    price_ratio_update_start_time: int,
    price_ratio_update_end_time: int,
) -> int:
    """
    @notice Compute the fourth root of the price ratio at the current time.
    @dev If start and end time are the same, return end value.
    """
    if current_time >= price_ratio_update_end_time:
        return end_fourth_root_price_ratio
    elif current_time <= price_ratio_update_start_time:
        return start_fourth_root_price_ratio

    exponent = div_down_fixed(
        current_time - price_ratio_update_start_time,
        price_ratio_update_end_time - price_ratio_update_start_time,
    )

    current_fourth_root_price_ratio = mul_down_fixed(
        start_fourth_root_price_ratio,
        LogExpMath.pow(
            div_down_fixed(
                end_fourth_root_price_ratio,
                start_fourth_root_price_ratio,
            ),
            exponent,
        ),
    )

    # Since we're rounding current fourth root price ratio down, we only need to check the lower boundary.
    minimum_fourth_root_price_ratio = min(
        start_fourth_root_price_ratio,
        end_fourth_root_price_ratio,
    )
    return max(
        minimum_fourth_root_price_ratio,
        current_fourth_root_price_ratio,
    )


def compute_centeredness(
    balances_scaled_18: List[int],
    virtual_balance_a: int,
    virtual_balance_b: int,
) -> Tuple[int, bool]:
    """
    @notice Compute the centeredness of the pool and whether it's above center.
    @dev The centeredness is defined between 0 and 1. If the numerator is greater than the denominator,
    we compute the inverse ratio.
    """
    if balances_scaled_18[0] == 0:
        # Also return false if both are 0 to be consistent with the logic below.
        return 0, False
    elif balances_scaled_18[1] == 0:
        return 0, True

    numerator = balances_scaled_18[0] * virtual_balance_b
    denominator = virtual_balance_a * balances_scaled_18[1]

    # The centeredness is defined between 0 and 1. If the numerator is greater than the denominator,
    # we compute the inverse ratio.
    if numerator <= denominator:
        pool_centeredness = div_down_fixed(numerator, denominator)
        is_pool_above_center = False
    else:
        pool_centeredness = div_down_fixed(denominator, numerator)
        is_pool_above_center = True

    return pool_centeredness, is_pool_above_center


def compute_invariant(
    balances_scaled_18: List[int],
    virtual_balance_a: int,
    virtual_balance_b: int,
    rounding: Rounding,
) -> int:
    mul_up_or_down = (
        mul_down_fixed if rounding.value == Rounding.ROUND_DOWN.value else mul_up_fixed
    )

    return mul_up_or_down(
        balances_scaled_18[0] + virtual_balance_a,
        balances_scaled_18[1] + virtual_balance_b,
    )


def compute_out_given_in(
    balances_scaled_18: List[int],
    virtual_balance_a: int,
    virtual_balance_b: int,
    token_in_index: int,
    token_out_index: int,
    amount_given_scaled_18: int,
) -> int:
    virtual_balance_token_in, virtual_balance_token_out = (
        (virtual_balance_a, virtual_balance_b)
        if token_in_index == 0
        else (virtual_balance_b, virtual_balance_a)
    )

    # Round up, so the swapper absorbs rounding imprecisions
    invariant = compute_invariant(
        balances_scaled_18,
        virtual_balance_a,
        virtual_balance_b,
        Rounding.ROUND_UP,
    )

    # Total (virtual + real) token out amount that should stay in the pool after the swap
    new_total_token_out_pool_balance = div_up_fixed(
        invariant,
        balances_scaled_18[token_in_index]
        + virtual_balance_token_in
        + amount_given_scaled_18,
    )

    current_total_token_out_pool_balance = (
        balances_scaled_18[token_out_index] + virtual_balance_token_out
    )

    if new_total_token_out_pool_balance > current_total_token_out_pool_balance:
        raise ValueError("reClammMath: NegativeAmountOut")

    amount_out_scaled_18 = (
        current_total_token_out_pool_balance - new_total_token_out_pool_balance
    )
    if amount_out_scaled_18 > balances_scaled_18[token_out_index]:
        raise ValueError("reClammMath: AmountOutGreaterThanBalance")

    return amount_out_scaled_18


def compute_in_given_out(
    balances_scaled_18: List[int],
    virtual_balance_a: int,
    virtual_balance_b: int,
    token_in_index: int,
    token_out_index: int,
    amount_out_scaled_18: int,
) -> int:
    if amount_out_scaled_18 > balances_scaled_18[token_out_index]:
        raise ValueError("reClammMath: AmountOutGreaterThanBalance")

    # Round up, so the swapper absorbs any imprecision due to rounding
    invariant = compute_invariant(
        balances_scaled_18,
        virtual_balance_a,
        virtual_balance_b,
        Rounding.ROUND_UP,
    )

    virtual_balance_token_in, virtual_balance_token_out = (
        (virtual_balance_a, virtual_balance_b)
        if token_in_index == 0
        else (virtual_balance_b, virtual_balance_a)
    )

    # Rounding division up, which will round the `tokenIn` amount up, favoring the Vault
    amount_in_scaled_18 = (
        div_up_fixed(
            invariant,
            balances_scaled_18[token_out_index]
            + virtual_balance_token_out
            - amount_out_scaled_18,
        )
        - balances_scaled_18[token_in_index]
        - virtual_balance_token_in
    )

    return amount_in_scaled_18

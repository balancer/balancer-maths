from typing import Tuple, List
from common.constants import RAY, TWO_WAD, WAD
from common.oz_math import sqrt
from common.log_exp_math import LogExpMath

from common.maths import (
    mul_down_fixed,
    div_up_fixed,
    div_down_fixed,
    mul_up_fixed,
    Rounding,
)


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

    is_pool_above_center = is_above_center(
        balances_scaled_18,
        last_virtual_balance_a,
        last_virtual_balance_b,
    )

    changed = False

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
                is_pool_above_center,
            )
        )
        changed = True

    if not is_pool_within_target_range(
        balances_scaled_18,
        current_virtual_balance_a,
        current_virtual_balance_b,
        centeredness_margin,
    ):
        current_virtual_balance_a, current_virtual_balance_b = (
            compute_virtual_balances_updating_price_range(
                current_fourth_root_price_ratio,
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


def compute_virtual_balances_updating_price_range(
    current_fourth_root_price_ratio: int,
    balances_scaled_18: List[int],
    virtual_balance_a: int,
    virtual_balance_b: int,
    is_pool_above_center: bool,
    daily_price_shift_base: int,
    current_timestamp: int,
    last_timestamp: int,
) -> Tuple[int, int]:
    # Round up price ratio, to round virtual balances down
    price_ratio = mul_up_fixed(
        current_fourth_root_price_ratio,
        current_fourth_root_price_ratio,
    )

    # The overvalued token is the one with a lower token balance (therefore, rarer and more valuable)
    if is_pool_above_center:
        balances_scaled_undervalued, balances_scaled_overvalued = (
            balances_scaled_18[0],
            balances_scaled_18[1],
        )
        virtual_balance_undervalued, virtual_balance_overvalued = (
            virtual_balance_a,
            virtual_balance_b,
        )
    else:
        balances_scaled_undervalued, balances_scaled_overvalued = (
            balances_scaled_18[1],
            balances_scaled_18[0],
        )
        virtual_balance_undervalued, virtual_balance_overvalued = (
            virtual_balance_b,
            virtual_balance_a,
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
        mul_down_fixed(price_ratio - WAD, virtual_balance_overvalued)
        - balances_scaled_overvalued
    )

    if is_pool_above_center:
        return virtual_balance_undervalued, virtual_balance_overvalued
    else:
        return virtual_balance_overvalued, virtual_balance_undervalued


def is_pool_within_target_range(
    balances_scaled_18: List[int],
    virtual_balance_a: int,
    virtual_balance_b: int,
    centeredness_margin: int,
) -> bool:
    centeredness = compute_centeredness(
        balances_scaled_18,
        virtual_balance_a,
        virtual_balance_b,
    )
    return centeredness >= centeredness_margin


def compute_fourth_root_price_ratio(
    current_time: int,
    start_fourth_root_price_ratio: int,
    end_fourth_root_price_ratio: int,
    price_ratio_update_start_time: int,
    price_ratio_update_end_time: int,
) -> int:
    if current_time >= price_ratio_update_end_time:
        return end_fourth_root_price_ratio
    elif current_time <= price_ratio_update_start_time:
        return start_fourth_root_price_ratio

    exponent = div_down_fixed(
        current_time - price_ratio_update_start_time,
        price_ratio_update_end_time - price_ratio_update_start_time,
    )

    return (
        start_fourth_root_price_ratio
        * LogExpMath.pow(end_fourth_root_price_ratio, exponent)
    ) // LogExpMath.pow(start_fourth_root_price_ratio, exponent)


def is_above_center(
    balances_scaled_18: List[int],
    virtual_balances_a: int,
    virtual_balances_b: int,
) -> bool:
    if balances_scaled_18[1] == 0:
        return True
    else:
        return div_down_fixed(
            balances_scaled_18[0], balances_scaled_18[1]
        ) > div_down_fixed(virtual_balances_a, virtual_balances_b)


def calculate_virtual_balances_updating_price_ratio(
    current_fourth_root_price_ratio: int,
    balances_scaled_18: List[int],
    last_virtual_balance_a: int,
    last_virtual_balance_b: int,
    is_pool_above_center: bool,
) -> Tuple[int, int]:
    # The overvalued token is the one with a lower token balance
    if is_pool_above_center:
        index_token_undervalued, index_token_overvalued = 0, 1
    else:
        index_token_undervalued, index_token_overvalued = 1, 0

    balance_token_undervalued = balances_scaled_18[index_token_undervalued]
    balance_token_overvalued = balances_scaled_18[index_token_overvalued]

    # Compute the current pool centeredness
    pool_centeredness = compute_centeredness(
        balances_scaled_18,
        last_virtual_balance_a,
        last_virtual_balance_b,
    )

    sqrt_price_ratio = mul_up_fixed(
        current_fourth_root_price_ratio,
        current_fourth_root_price_ratio,
    )

    # Using FixedPoint math as little as possible to improve precision
    virtual_balance_undervalued = (
        balance_token_overvalued
        * (
            WAD
            + pool_centeredness
            + sqrt(
                pool_centeredness * (pool_centeredness + 4 * sqrt_price_ratio - TWO_WAD)
                + RAY
            )
        )
    ) // (2 * (sqrt_price_ratio - WAD))

    virtual_balance_overvalued = div_down_fixed(
        (balance_token_overvalued * virtual_balance_undervalued)
        // balance_token_undervalued,
        pool_centeredness,
    )

    if is_pool_above_center:
        return virtual_balance_undervalued, virtual_balance_overvalued
    else:
        return virtual_balance_overvalued, virtual_balance_undervalued


def compute_centeredness(
    balances_scaled_18: List[int],
    virtual_balance_a: int,
    virtual_balance_b: int,
) -> int:
    if balances_scaled_18[0] == 0 or balances_scaled_18[1] == 0:
        return 0

    is_pool_above_center = is_above_center(
        balances_scaled_18,
        virtual_balance_a,
        virtual_balance_b,
    )

    if is_pool_above_center:
        virtual_balance_undervalued, virtual_balance_overvalued = (
            virtual_balance_a,
            virtual_balance_b,
        )
        balances_scaled_undervalued, balances_scaled_overvalued = (
            balances_scaled_18[0],
            balances_scaled_18[1],
        )
    else:
        virtual_balance_undervalued, virtual_balance_overvalued = (
            virtual_balance_b,
            virtual_balance_a,
        )
        balances_scaled_undervalued, balances_scaled_overvalued = (
            balances_scaled_18[1],
            balances_scaled_18[0],
        )

    # Round up the centeredness, so the virtual balances are rounded down when the pool prices are moving
    return div_up_fixed(
        (balances_scaled_overvalued * virtual_balance_undervalued)
        // balances_scaled_undervalued,
        virtual_balance_overvalued,
    )


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


def compute_theoretical_price_ratio_and_balances(
    min_price: int,
    max_price: int,
    target_price: int,
) -> Tuple[List[int], List[int], int]:
    # In the formulas below, Ra_max is a random number that defines the maximum real balance of token A, and
    # consequently a random initial liquidity. We will scale all balances according to the actual amount of
    # liquidity provided during initialization.
    sqrt_price_ratio = sqrt_scaled_18(div_down_fixed(max_price, min_price))
    fourth_root_price_ratio = sqrt_scaled_18(sqrt_price_ratio)

    virtual_balances = [0, 0]
    # Va = Ra_max / (sqrtPriceRatio - 1)
    virtual_balances[A] = div_down_fixed(
        INITIALIZATION_MAX_BALANCE_A,
        sqrt_price_ratio - WAD,
    )
    # Vb = minPrice * (Va + Ra_max)
    virtual_balances[B] = mul_down_fixed(
        min_price,
        virtual_balances[A] + INITIALIZATION_MAX_BALANCE_A,
    )

    real_balances = [0, 0]
    # Rb = sqrt(targetPrice * Vb * (Ra_max + Va)) - Vb
    real_balances[B] = (
        sqrt_scaled_18(
            mul_up_fixed(
                mul_up_fixed(target_price, virtual_balances[B]),
                INITIALIZATION_MAX_BALANCE_A + virtual_balances[A],
            )
        )
        - virtual_balances[B]
    )
    # Ra = (Rb + Vb - (Va * targetPrice)) / targetPrice
    real_balances[A] = div_down_fixed(
        real_balances[B]
        + virtual_balances[B]
        - mul_down_fixed(virtual_balances[A], target_price),
        target_price,
    )

    return real_balances, virtual_balances, fourth_root_price_ratio


def compute_initial_balance_ratio(
    min_price: int,
    max_price: int,
    target_price: int,
) -> int:
    real_balances, _, _ = compute_theoretical_price_ratio_and_balances(
        min_price,
        max_price,
        target_price,
    )
    return div_down_fixed(real_balances[B], real_balances[A])


def sqrt_scaled_18(value_scaled_18: int) -> int:
    return sqrt(value_scaled_18 * WAD)

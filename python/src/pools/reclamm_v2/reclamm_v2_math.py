from typing import List, Tuple

from src.common.bigint import BigInt
from src.common.constants import TWO_WAD, WAD
from src.common.log_exp_math import LogExpMath
from src.common.maths import (
    Rounding,
    div_down_fixed,
    div_up_fixed,
    mul_div_up_fixed,
    mul_down_fixed,
    mul_up_fixed,
    pow_down_fixed,
)
from src.common.oz_math import sqrt

# Constants
A = 0
B = 1
THIRTY_DAYS_SECONDS = 30 * 24 * 60 * 60  # 2,592,000 seconds


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
            compute_virtual_balances_updating_price_ratio(
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


def compute_virtual_balances_updating_price_ratio(
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
    centeredness, is_pool_above_center = compute_centeredness(
        balances_scaled_18,
        last_virtual_balance_a,
        last_virtual_balance_b,
    )

    # The overvalued token is the one with a lower token balance (therefore, rarer and more valuable).
    if is_pool_above_center:
        balance_token_undervalued = balances_scaled_18[A]
        last_virtual_balance_undervalued = last_virtual_balance_a
        last_virtual_balance_overvalued = last_virtual_balance_b
    else:
        balance_token_undervalued = balances_scaled_18[B]
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
    virtual_balance_undervalued = int(
        BigInt(balance_token_undervalued)
        * BigInt(
            WAD
            + centeredness
            + sqrt(
                centeredness * (centeredness + 4 * sqrt_price_ratio - TWO_WAD)
                + WAD * WAD
            )
        )
        // BigInt(2 * (sqrt_price_ratio - WAD))
    )

    virtual_balance_overvalued = int(
        BigInt(virtual_balance_undervalued)
        * BigInt(last_virtual_balance_overvalued)
        // BigInt(last_virtual_balance_undervalued)
    )

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
    sqrt_price_ratio = sqrt_scaled_18(
        compute_price_ratio(balances_scaled_18, virtual_balance_a, virtual_balance_b)
    )

    # The overvalued token is the one with a lower token balance (therefore, rarer and more valuable).
    if is_pool_above_center:
        balances_scaled_undervalued = balances_scaled_18[0]
        balances_scaled_overvalued = balances_scaled_18[1]
        virtual_balance_undervalued = virtual_balance_a
        virtual_balance_overvalued = virtual_balance_b
    else:
        balances_scaled_undervalued = balances_scaled_18[1]
        balances_scaled_overvalued = balances_scaled_18[0]
        virtual_balance_undervalued = virtual_balance_b
        virtual_balance_overvalued = virtual_balance_a

    # +-----------------------------------------+
    # |                      (Tc - Tl)          |
    # |      Vo = Vo * (Psb)^                   |
    # +-----------------------------------------+
    # |  Where:                                 |
    # |    Vo = Virtual balance overvalued      |
    # |    Psb = Price shift daily rate base    |
    # |    Tc = Current timestamp               |
    # |    Tl = Last timestamp                  |
    # +-----------------------------------------+
    # |               Ru * (Vo + Ro)            |
    # |      Vu = ----------------------        |
    # |             (Qo - 1) * Vo - Ro          |
    # +-----------------------------------------+
    # |  Where:                                 |
    # |    Vu = Virtual balance undervalued     |
    # |    Vo = Virtual balance overvalued      |
    # |    Ru = Real balance undervalued        |
    # |    Ro = Real balance overvalued         |
    # |    Qo = Square root of price ratio      |
    # +-----------------------------------------+

    # Cap the duration (time between operations) at 30 days, to ensure `pow_down` does not overflow.
    duration = min(current_timestamp - last_timestamp, THIRTY_DAYS_SECONDS)

    virtual_balance_overvalued = mul_down_fixed(
        virtual_balance_overvalued,
        pow_down_fixed(daily_price_shift_base, duration * WAD),
    )

    # Ensure that Vo does not go below the minimum allowed value (corresponding to centeredness == 1).
    virtual_balance_overvalued = max(
        virtual_balance_overvalued,
        div_down_fixed(
            balances_scaled_overvalued,
            sqrt_scaled_18(sqrt_price_ratio) - WAD,
        ),
    )

    virtual_balance_undervalued = int(
        BigInt(balances_scaled_undervalued)
        * BigInt(virtual_balance_overvalued + balances_scaled_overvalued)
        // BigInt(
            mul_down_fixed(sqrt_price_ratio - WAD, virtual_balance_overvalued)
            - balances_scaled_overvalued
        )
    )

    if is_pool_above_center:
        return virtual_balance_undervalued, virtual_balance_overvalued
    else:
        return virtual_balance_overvalued, virtual_balance_undervalued


def compute_price_ratio(
    balances_scaled_18: List[int],
    virtual_balance_a: int,
    virtual_balance_b: int,
) -> int:
    """
    @notice Compute the price ratio of the pool by dividing the maximum price by the minimum price.
    @dev The price ratio is calculated as maxPrice/minPrice, where maxPrice and minPrice are obtained
    from compute_price_range.

    @param balances_scaled_18 Current pool balances, sorted in token registration order
    @param virtual_balance_a Virtual balance of token A
    @param virtual_balance_b Virtual balance of token B
    @return price_ratio The ratio between the maximum and minimum prices of the pool
    """
    min_price, max_price = compute_price_range(
        balances_scaled_18, virtual_balance_a, virtual_balance_b
    )

    return div_up_fixed(max_price, min_price)


def compute_price_range(
    balances_scaled_18: List[int],
    virtual_balance_a: int,
    virtual_balance_b: int,
) -> Tuple[int, int]:
    """
    @notice Compute the minimum and maximum prices for the pool based on virtual balances and current invariant.
    @dev The minimum price is calculated as Vb^2/invariant, where Vb is the virtual balance of token B.
    The maximum price is calculated as invariant/Va^2, where Va is the virtual balance of token A.
    These calculations are derived from the invariant equation: invariant = (Ra + Va)(Rb + Vb),
    where Ra and Rb are the real balances of tokens A and B respectively.

    @param balances_scaled_18 Current pool balances, sorted in token registration order
    @param virtual_balance_a Virtual balance of token A
    @param virtual_balance_b Virtual balance of token B
    @return min_price The minimum price of token A in terms of token B
    @return max_price The maximum price of token A in terms of token B
    """
    current_invariant = compute_invariant(
        balances_scaled_18, virtual_balance_a, virtual_balance_b, Rounding.ROUND_DOWN
    )

    # P_min(a) = Vb / (Va + Ra_max)
    # We don't have Ra_max, but: invariant=(Ra_max + Va)(Vb)
    # Then, (Va + Ra_max) = invariant/Vb, and:
    # P_min(a) = Vb^2 / invariant
    min_price = int(
        BigInt(virtual_balance_b)
        * BigInt(virtual_balance_b)
        // BigInt(current_invariant)
    )

    # Similarly, P_max(a) = (Rb_max + Vb)/Va
    # We don't have Rb_max, but: invariant=(Rb_max + Vb)(Va)
    # Then, (Rb_max + Vb) = invariant/Va, and:
    # P_max(a) = invariant / Va^2
    max_price = div_down_fixed(
        current_invariant, mul_down_fixed(virtual_balance_a, virtual_balance_a)
    )

    return min_price, max_price


def compute_fourth_root_price_ratio(
    current_time: int,
    start_fourth_root_price_ratio: int,
    end_fourth_root_price_ratio: int,
    price_ratio_update_start_time: int,
    price_ratio_update_end_time: int,
) -> int:
    # if start and end time are the same, return end value.
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
            div_down_fixed(end_fourth_root_price_ratio, start_fourth_root_price_ratio),
            exponent,
        ),
    )

    # Since we're rounding current fourth root price ratio down, we only need to check the lower boundary.
    minimum_fourth_root_price_ratio = min(
        start_fourth_root_price_ratio, end_fourth_root_price_ratio
    )
    return max(minimum_fourth_root_price_ratio, current_fourth_root_price_ratio)


def compute_centeredness(
    balances_scaled_18: List[int],
    virtual_balance_a: int,
    virtual_balance_b: int,
) -> Tuple[int, bool]:
    if balances_scaled_18[A] == 0:
        # Also return false if both are 0 to be consistent with the logic below.
        return 0, False
    elif balances_scaled_18[B] == 0:
        return 0, True

    numerator = balances_scaled_18[A] * virtual_balance_b
    denominator = virtual_balance_a * balances_scaled_18[B]

    # The centeredness is defined between 0 and 1. If the numerator is greater than the denominator, we compute
    # the inverse ratio.
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
    if rounding.value == Rounding.ROUND_DOWN.value:
        _mul_up_or_down = mul_down_fixed
    else:
        _mul_up_or_down = mul_up_fixed

    return _mul_up_or_down(
        balances_scaled_18[0] + virtual_balance_a,
        balances_scaled_18[1] + virtual_balance_b,
    )


def compute_out_given_in(
    balances_scaled_18: List[int],
    virtual_balance_a: int,
    virtual_balance_b: int,
    token_in_index: int,
    token_out_index: int,
    amount_in_scaled_18: int,
) -> int:
    """
    @notice Compute the `amountOut` of tokenOut in a swap, given the current balances and virtual balances.
    @param balances_scaled_18 Current pool balances, sorted in token registration order
    @param virtual_balance_a The last virtual balance of token A
    @param virtual_balance_b The last virtual balance of token B
    @param token_in_index Index of the token being swapped in
    @param token_out_index Index of the token being swapped out
    @param amount_in_scaled_18 The exact amount of `tokenIn` (i.e., the amount given in an ExactIn swap)
    @return amount_out_scaled_18 The calculated amount of `tokenOut` returned in an ExactIn swap
    """
    # `amountOutScaled18 = currentTotalTokenOutPoolBalance - newTotalTokenOutPoolBalance`,
    # where `currentTotalTokenOutPoolBalance = balancesScaled18[tokenOutIndex] + virtualBalanceTokenOut`
    # and `newTotalTokenOutPoolBalance = invariant / (currentTotalTokenInPoolBalance + amountInScaled18)`.
    # In other words,
    # +--------------------------------------------------+
    # |                         L                        |
    # | Ao = Bo + Vo - ---------------------             |
    # |                   (Bi + Vi + Ai)                 |
    # +--------------------------------------------------+
    # Simplify by:
    # - replacing `L = (Bo + Vo) (Bi + Vi)`, and
    # - multiplying `(Bo + Vo)` by `(Bi + Vi + Ai) / (Bi + Vi + Ai)`:
    # +--------------------------------------------------+
    # |              (Bo + Vo) Ai                        |
    # | Ao = ------------------------------              |
    # |             (Bi + Vi + Ai)                       |
    # +--------------------------------------------------+
    # | Where:                                           |
    # |   Ao = Amount out                                |
    # |   Bo = Balance token out                         |
    # |   Vo = Virtual balance token out                 |
    # |   Ai = Amount in                                 |
    # |   Bi = Balance token in                          |
    # |   Vi = Virtual balance token in                  |
    # +--------------------------------------------------+
    if token_in_index == 0:
        virtual_balance_token_in = virtual_balance_a
        virtual_balance_token_out = virtual_balance_b
    else:
        virtual_balance_token_in = virtual_balance_b
        virtual_balance_token_out = virtual_balance_a

    # Use BigInt for precise division to avoid off-by-one errors
    amount_out_scaled_18 = int(
        BigInt(balances_scaled_18[token_out_index] + virtual_balance_token_out)
        * BigInt(amount_in_scaled_18)
        // BigInt(
            balances_scaled_18[token_in_index]
            + virtual_balance_token_in
            + amount_in_scaled_18
        )
    )

    if amount_out_scaled_18 > balances_scaled_18[token_out_index]:
        # Amount out cannot be greater than the real balance of the token in the pool.
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
    """
    @notice Compute the `amountIn` of tokenIn in a swap, given the current balances and virtual balances.
    @param balances_scaled_18 Current pool balances, sorted in token registration order
    @param virtual_balance_a The last virtual balances of token A
    @param virtual_balance_b The last virtual balances of token B
    @param token_in_index Index of the token being swapped in
    @param token_out_index Index of the token being swapped out
    @param amount_out_scaled_18 The exact amount of `tokenOut` (i.e., the amount given in an ExactOut swap)
    @return amount_in_scaled_18 The calculated amount of `tokenIn` returned in an ExactOut swap
    """
    # `amountInScaled18 = newTotalTokenOutPoolBalance - currentTotalTokenInPoolBalance`,
    # where `newTotalTokenOutPoolBalance = invariant / (currentTotalTokenOutPoolBalance - amountOutScaled18)`
    # and `currentTotalTokenInPoolBalance = balancesScaled18[tokenInIndex] + virtualBalanceTokenIn`.
    # In other words,
    # +--------------------------------------------------+
    # |               L                                  |
    # | Ai = --------------------- - (Bi + Vi)           |
    # |         (Bo + Vo - Ao)                           |
    # +--------------------------------------------------+
    # Simplify by:
    # - replacing `L = (Bo + Vo) (Bi + Vi)`, and
    # - multiplying `(Bi + Vi)` by `(Bo + Vo - Ao) / (Bo + Vo - Ao)`:
    # +--------------------------------------------------+
    # |              (Bi + Vi) Ao                        |
    # | Ai = ------------------------------              |
    # |             (Bo + Vo - Ao)                       |
    # +--------------------------------------------------+
    # | Where:                                           |
    # |   Ao = Amount out                                |
    # |   Bo = Balance token out                         |
    # |   Vo = Virtual balance token out                 |
    # |   Ai = Amount in                                 |
    # |   Bi = Balance token in                          |
    # |   Vi = Virtual balance token in                  |
    # +--------------------------------------------------+

    if amount_out_scaled_18 > balances_scaled_18[token_out_index]:
        # Amount out cannot be greater than the real balance of the token in the pool.
        raise ValueError("reClammMath: AmountOutGreaterThanBalance")

    if token_in_index == 0:
        virtual_balance_token_in = virtual_balance_a
        virtual_balance_token_out = virtual_balance_b
    else:
        virtual_balance_token_in = virtual_balance_b
        virtual_balance_token_out = virtual_balance_a

    # Round up to favor the vault (i.e. request larger amount in from the user).
    amount_in_scaled_18 = mul_div_up_fixed(
        balances_scaled_18[token_in_index] + virtual_balance_token_in,
        amount_out_scaled_18,
        balances_scaled_18[token_out_index]
        + virtual_balance_token_out
        - amount_out_scaled_18,
    )

    return amount_in_scaled_18


def sqrt_scaled_18(value_scaled_18: int) -> int:
    """
    @notice Calculate the square root of a value scaled by 18 decimals.
    @param value_scaled_18 The value to calculate the square root of, scaled by 18 decimals
    @return sqrt_value_scaled_18 The square root of the value scaled by 18 decimals
    """
    return sqrt(value_scaled_18 * WAD)

from dataclasses import dataclass

from src.common.maths import (
    WAD,
    Rounding,
    div_down_fixed,
    div_up_fixed,
    mul_down_fixed,
    mul_up_fixed,
)
from src.pools.gyro.gyro_pool_math import gyro_pool_math_sqrt


@dataclass
class QuadraticTerms:
    """Represents the terms needed for quadratic formula solution."""

    a: int
    mb: int
    b_square: int
    mc: int


def calculate_invariant(
    balances: list[int], sqrt_alpha: int, sqrt_beta: int, rounding: Rounding
) -> int:
    """
    Calculate invariant using quadratic formula.

    The formula solves: 0 = (1-sqrt(alpha/beta)*L^2 - (y/sqrt(beta)+x*sqrt(alpha))*L - x*y)
    Using quadratic formula: 0 = a*L^2 + b*L + c
    Where a > 0, b < 0, and c < 0

    For mb = -b and mc = -c:
    L = (mb + (mb^2 + 4 * a * mc)^(1/2)) / (2 * a)

    Args:
        balances: List of pool balances as integers
        sqrt_alpha: Square root of alpha parameter
        sqrt_beta: Square root of beta parameter
        rounding: Rounding direction

    Returns:
        Calculated invariant as integer
    """
    # Get quadratic terms from helper function
    quadratic_terms = calculate_quadratic_terms(
        balances, sqrt_alpha, sqrt_beta, rounding
    )

    # Calculate final result using quadratic formula
    return calculate_quadratic(
        quadratic_terms.a,
        quadratic_terms.mb,
        quadratic_terms.b_square,
        quadratic_terms.mc,
    )


def calculate_quadratic_terms(
    balances: list[int], sqrt_alpha: int, sqrt_beta: int, rounding: Rounding
) -> QuadraticTerms:
    """
    Calculate the terms needed for quadratic formula solution.

    Args:
        balances: List of pool balances as integers
        sqrt_alpha: Square root of alpha parameter
        sqrt_beta: Square root of beta parameter
        rounding: Rounding direction ("ROUND_DOWN" or "ROUND_UP")

    Returns:
        QuadraticTerms containing a, mb, b_square, and mc terms
    """
    # Define rounding functions based on rounding direction
    div_up_or_down = (
        div_down_fixed if rounding.value == Rounding.ROUND_DOWN.value else div_up_fixed
    )

    mul_up_or_down = (
        mul_down_fixed if rounding.value == Rounding.ROUND_DOWN.value else mul_up_fixed
    )

    mul_down_or_up = (
        mul_up_fixed if rounding.value == Rounding.ROUND_DOWN.value else mul_down_fixed
    )

    # Calculate 'a' term
    # Note: 'a' follows opposite rounding than 'b' and 'c' since it's in denominator
    a = WAD - div_up_or_down(sqrt_alpha, sqrt_beta)

    # Calculate 'b' terms (in numerator)
    b_term0 = div_up_or_down(balances[1], sqrt_beta)
    b_term1 = mul_up_or_down(balances[0], sqrt_alpha)
    mb = b_term0 + b_term1

    # Calculate 'c' term (in numerator)
    mc = mul_up_or_down(balances[0], balances[1])

    # Calculate b² for better fixed point precision
    # b² = x² * alpha + x*y*2*sqrt(alpha/beta) + y²/beta
    b_square = mul_up_or_down(
        mul_up_or_down(mul_up_or_down(balances[0], balances[0]), sqrt_alpha), sqrt_alpha
    )

    b_sq2 = div_up_or_down(
        2 * mul_up_or_down(mul_up_or_down(balances[0], balances[1]), sqrt_alpha),
        sqrt_beta,
    )

    b_sq3 = div_up_or_down(
        mul_up_or_down(balances[1], balances[1]), mul_down_or_up(sqrt_beta, sqrt_beta)
    )

    b_square = b_square + b_sq2 + b_sq3

    return QuadraticTerms(a=a, mb=mb, b_square=b_square, mc=mc)


def calculate_quadratic(
    a: int,
    mb: int,
    b_square: int,  # b² can be calculated separately with more precision
    mc: int,
) -> int:
    """
    Calculate quadratic formula solution using provided terms.

    Args:
        a: 'a' term from quadratic equation
        mb: -b term from quadratic equation
        b_square: b² term (calculated separately for precision)
        mc: -c term from quadratic equation

    Returns:
        Calculated invariant
    """
    # Calculate denominator
    denominator = mul_up_fixed(a, 2 * WAD)

    # Order multiplications for fixed point precision
    add_term = mul_down_fixed(mul_down_fixed(mc, 4 * WAD), a)

    # The minus sign in the radicand cancels out in this special case
    radicand = b_square + add_term

    # Calculate square root
    sqr_result = gyro_pool_math_sqrt(radicand, 5)

    # The minus sign in the numerator cancels out in this special case
    numerator = mb + sqr_result

    # Calculate final result
    invariant = div_down_fixed(numerator, denominator)

    return invariant


def calc_out_given_in(
    balance_in: int,
    balance_out: int,
    amount_in: int,
    virtual_offset_in: int,
    virtual_offset_out: int,
) -> int:
    # """
    # Calculate the output amount given an input amount for a trade.

    # Described for X = 'in' asset and Y = 'out' asset, but equivalent for the other case:
    # dX = incrX  = amountIn  > 0
    # dY = incrY = amountOut < 0
    # x = balanceIn             x' = x + virtualParamX
    # y = balanceOut            y' = y + virtualParamY
    # L  = inv.Liq                   /            x' * y'          \          y' * dX
    #                    |dy| = y' - |   --------------------------  |   = --------------  -
    # x' = virtIn                    \          ( x' + dX)         /          x' + dX
    # y' = virtOut

    # Note that -dy > 0 is what the trader receives.
    # We exploit the fact that this formula is symmetric up to virtualOffset{X,Y}.
    # We do not use L^2, but rather x' * y', to prevent potential accumulation of errors.
    # We add a very small safety margin to compensate for potential errors in the invariant.

    # Args:
    #     balance_in: Current balance of input token
    #     balance_out: Current balance of output token
    #     amount_in: Amount of input token being traded
    #     virtual_offset_in: Virtual offset parameter for input token
    #     virtual_offset_out: Virtual offset parameter for output token

    # Returns:
    #     Amount of output token to be received

    # Raises:
    #     ValueError: If calculated output amount exceeds available balance
    # """
    # The factors lead to a multiplicative "safety margin" between virtual offsets
    # that is very slightly larger than 3e-18
    virt_in_over = balance_in + mul_up_fixed(virtual_offset_in, WAD + 2)

    virt_out_under = balance_out + mul_down_fixed(virtual_offset_out, WAD - 1)

    # Calculate output amount
    amount_out = div_down_fixed(
        mul_down_fixed(virt_out_under, amount_in), virt_in_over + amount_in
    )

    # Ensure amountOut < balanceOut
    if not amount_out <= balance_out:
        raise ValueError("AssetBoundsExceeded")

    return amount_out


def calc_in_given_out(
    balance_in: int,
    balance_out: int,
    amount_out: int,
    virtual_offset_in: int,
    virtual_offset_out: int,
) -> int:
    # """
    # Calculate the input amount required given a desired output amount for a trade.

    # dX = incrX  = amountIn  > 0
    # dY = incrY  = amountOut < 0
    # x = balanceIn             x' = x + virtualParamX
    # y = balanceOut            y' = y + virtualParamY
    # x = balanceIn
    # L  = inv.Liq               /            x' * y'          \                x' * dy
    #                      dx =  |   --------------------------  |  -  x'  = - -----------
    # x' = virtIn               \             y' + dy          /                y' + dy
    # y' = virtOut

    # Note that dy < 0 < dx.
    # We exploit the fact that this formula is symmetric up to virtualOffset{X,Y}.
    # We do not use L^2, but rather x' * y', to prevent potential accumulation of errors.
    # We add a very small safety margin to compensate for potential errors in the invariant.

    # Args:
    #     balance_in: Current balance of input token
    #     balance_out: Current balance of output token
    #     amount_out: Desired amount of output token
    #     virtual_offset_in: Virtual offset parameter for input token
    #     virtual_offset_out: Virtual offset parameter for output token

    # Returns:
    #     Required amount of input token

    # Raises:
    #     ValueError: If requested output amount exceeds available balance
    # """
    # Check if output amount exceeds balance
    if not amount_out <= balance_out:
        raise ValueError("AssetBoundsExceeded")

    # The factors lead to a multiplicative "safety margin" between virtual offsets
    # that is very slightly larger than 3e-18
    virt_in_over = balance_in + mul_up_fixed(virtual_offset_in, WAD + 2)

    virt_out_under = balance_out + mul_down_fixed(virtual_offset_out, WAD - 1)

    # Calculate input amount
    amount_in = div_up_fixed(
        mul_up_fixed(virt_in_over, amount_out), virt_out_under - amount_out
    )

    return amount_in


def calculate_virtual_parameter0(
    invariant: int, _sqrt_beta: int, rounding: Rounding
) -> int:
    """
    Calculate the virtual offset 'a' for reserves 'x', as in (x+a)*(y+b)=L^2.

    Args:
        invariant: Pool invariant value
        _sqrt_beta: Square root of beta parameter
        rounding: Rounding direction ("ROUND_DOWN" or "ROUND_UP")

    Returns:
        Virtual parameter 'a'
    """
    return (
        div_down_fixed(invariant, _sqrt_beta)
        if rounding.value == Rounding.ROUND_DOWN.value
        else div_up_fixed(invariant, _sqrt_beta)
    )


def calculate_virtual_parameter1(
    invariant: int, _sqrt_alpha: int, rounding: Rounding
) -> int:
    """
    Calculate the virtual offset 'b' for reserves 'y', as in (x+a)*(y+b)=L^2.

    Args:
        invariant: Pool invariant value
        _sqrt_alpha: Square root of alpha parameter
        rounding: Rounding direction ("ROUND_DOWN" or "ROUND_UP")

    Returns:
        Virtual parameter 'b'
    """
    return (
        mul_down_fixed(invariant, _sqrt_alpha)
        if rounding.value == Rounding.ROUND_DOWN.value
        else mul_up_fixed(invariant, _sqrt_alpha)
    )

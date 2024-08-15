WAD = 10**18
HUNDRED_WAD = 100000000000000000000
RAY = 1000000000000000000000000000000000000


class LogExpMath:
    # All fixed point multiplications and divisions are inlined. This means we need to divide by ONE when multiplying
    # two numbers, and multiply by ONE when dividing them.

    # The domain of natural exponentiation is bound by the word size and number of decimals used.
    #
    # Because internally the result will be stored using 20 decimals, the largest possible result is
    # (2^255 - 1) / 10^20, which makes the largest exponent ln((2^255 - 1) / 10^20) = 130.700829182905140221.
    # The smallest possible result is 10^(-18), which makes largest negative argument
    # ln(10^(-18)) = -41.446531673892822312.
    # We use 130.0 and -41.0 to have some safety margin.
    MAX_NATURAL_EXPONENT = 130000000000000000000
    MIN_NATURAL_EXPONENT = -41000000000000000000

    # Bounds for ln_36's argument. Both ln(0.9) and ln(1.1) can be represented with 36 decimal places in a fixed point
    # 256 bit integer.
    LN_36_LOWER_BOUND = WAD - 100000000000000000
    LN_36_UPPER_BOUND = WAD + 100000000000000000

    # MILD_EXPONENT_BOUND = 2 ** 254 / HUNDRED_WAD
    # Precomputed value of the above expression
    MILD_EXPONENT_BOUND = 289480223093290488558927462521719769633174961664101410098

    # 18 decimal constants
    x0 = 128000000000000000000  # 2ˆ7
    a0 = (
        38877084059945950922200000000000000000000000000000000000  # eˆ(x0) (no decimals)
    )
    x1 = 64000000000000000000  # 2ˆ6
    a1 = 6235149080811616882910000000  # eˆ(x1) (no decimals)

    # 20 decimal constants
    x2 = 3200000000000000000000  # 2ˆ5
    a2 = 7896296018268069516100000000000000  # eˆ(x2)
    x3 = 1600000000000000000000  # 2ˆ4
    a3 = 888611052050787263676000000  # eˆ(x3)
    x4 = 800000000000000000000  # 2ˆ3
    a4 = 298095798704172827474000  # eˆ(x4)
    x5 = 400000000000000000000  # 2ˆ2
    a5 = 5459815003314423907810  # eˆ(x5)
    x6 = 200000000000000000000  # 2ˆ1
    a6 = 738905609893065022723  # eˆ(x6)
    x7 = 100000000000000000000  # 2ˆ0
    a7 = 271828182845904523536  # eˆ(x7)
    x8 = 50000000000000000000  # 2ˆ-1
    a8 = 164872127070012814685  # eˆ(x8)
    x9 = 25000000000000000000  # 2ˆ-2
    a9 = 128402541668774148407  # eˆ(x9)
    x10 = 12500000000000000000  # 2ˆ-3
    a10 = 113314845306682631683  # eˆ(x10)
    x11 = 6250000000000000000  # 2ˆ-4
    a11 = 106449445891785942956  # eˆ(x11)

    # All arguments and return values are 18 decimal fixed point numbers.
    @staticmethod
    def pow(x: int, y: int) -> int:
        if y == 0:
            # We solve the 0^0 indetermination by making it equal one.
            return WAD

        if x == 0:
            return 0

        # Instead of computing x^y directly, we instead rely on the properties of logarithms and exponentiation to
        # arrive at that result. In particular, exp(ln(x)) = x, and ln(x^y) = y * ln(x). This means
        # x^y = exp(y * ln(x)).

        # The ln function takes a signed value, so we need to make sure x fits in the signed 256 bit range.
        assert (
            x
            < 57896044618658097711785492504343953926634992332820282019728792003956564819968
        ), "Errors.X_OUT_OF_BOUNDS"
        x_int256 = x

        # We will compute y * ln(x) in a single step. Depending on the value of x, we can either use ln or ln_36. In
        # both cases, we leave the division by ONE_18 (due to fixed point multiplication) to the end.

        # This prevents y * ln(x) from overflowing, and at the same time guarantees y fits in the signed 256 bit range.
        assert y < LogExpMath.MILD_EXPONENT_BOUND, "Errors.Y_OUT_OF_BOUNDS"
        y_int256 = y

        if LogExpMath.LN_36_LOWER_BOUND < x_int256 < LogExpMath.LN_36_UPPER_BOUND:
            ln_36_x = LogExpMath._ln_36(x_int256)

            # ln_36_x has 36 decimal places, so multiplying by y_int256 isn't as straightforward, since we can't just
            # bring y_int256 to 36 decimal places, as it might overflow. Instead, we perform two 18 decimal
            # multiplications and add the results: one with the first 18 decimals of ln_36_x, and one with the
            # (downscaled) last 18 decimals.
            logx_times_y = (ln_36_x // WAD) * y_int256 + (
                (ln_36_x % WAD) * y_int256
            ) // WAD
        else:
            logx_times_y = LogExpMath._ln(x_int256) * y_int256

        logx_times_y //= WAD

        # Finally, we compute exp(y * ln(x)) to arrive at x^y
        assert (
            LogExpMath.MIN_NATURAL_EXPONENT
            <= logx_times_y
            <= LogExpMath.MAX_NATURAL_EXPONENT
        ), "Errors.PRODUCT_OUT_OF_BOUNDS"

        return LogExpMath.exp(logx_times_y)

    @staticmethod
    def exp(x_: int) -> int:
        x = x_
        assert (
            LogExpMath.MIN_NATURAL_EXPONENT <= x <= LogExpMath.MAX_NATURAL_EXPONENT
        ), "Errors.INVALID_EXPONENT"

        if x < 0:
            # We only handle positive exponents: e^(-x) is computed as 1 / e^x. We can safely make x positive since it
            # fits in the signed 256 bit range (as it is larger than MIN_NATURAL_EXPONENT).
            # Fixed point division requires multiplying by ONE_18.
            return (WAD * WAD) // LogExpMath.exp(-x)

        # First, we use the fact that e^(x+y) = e^x * e^y to decompose x into a sum of powers of two, which we call x_n,
        # where x_n == 2^(7 - n), and e^x_n = a_n has been precomputed. We choose the first x_n, x0, to equal 2^7
        # because all larger powers are larger than MAX_NATURAL_EXPONENT, and therefore not present in the
        # decomposition.
        # At the end of this process we will have the product of all e^x_n = a_n that apply, and the remainder of this
        # decomposition, which will be lower than the smallest x_n.
        # exp(x) = k_0 * a_0 * k_1 * a_1 * ... + k_n * a_n * exp(remainder), where each k_n equals either 0 or 1.
        # We mutate x by subtracting x_n, making it the remainder of the decomposition.

        # The first two a_n (e^(2^7) and e^(2^6)) are too large if stored as 18 decimal numbers, and could cause
        # intermediate overflows. Instead we store them as plain integers, with 0 decimals.
        # Additionally, x0 + x1 is larger than MAX_NATURAL_EXPONENT, which means they will not both be present in the
        # decomposition.

        # For each x_n, we test if that term is present in the decomposition (if x is larger than it), and if so deduct
        # it and compute the accumulated product.

        if x >= LogExpMath.x0:
            x -= LogExpMath.x0
            first_an = LogExpMath.a0
        elif x >= LogExpMath.x1:
            x -= LogExpMath.x1
            first_an = LogExpMath.a1
        else:
            first_an = 1

        # We now transform x into a 20 decimal fixed point number, to have enhanced precision when computing the
        # smaller terms.
        x *= 100

        # `product` is the accumulated product of all a_n (except a0 and a1), which starts at 20 decimal fixed point
        # one. Recall that fixed point multiplication requires dividing by ONE_20.
        product = HUNDRED_WAD

        if x >= LogExpMath.x2:
            x -= LogExpMath.x2
            product = (product * LogExpMath.a2) // HUNDRED_WAD

        if x >= LogExpMath.x3:
            x -= LogExpMath.x3
            product = (product * LogExpMath.a3) // HUNDRED_WAD

        if x >= LogExpMath.x4:
            x -= LogExpMath.x4
            product = (product * LogExpMath.a4) // HUNDRED_WAD

        if x >= LogExpMath.x5:
            x -= LogExpMath.x5
            product = (product * LogExpMath.a5) // HUNDRED_WAD

        if x >= LogExpMath.x6:
            x -= LogExpMath.x6
            product = (product * LogExpMath.a6) // HUNDRED_WAD

        if x >= LogExpMath.x7:
            x -= LogExpMath.x7
            product = (product * LogExpMath.a7) // HUNDRED_WAD

        if x >= LogExpMath.x8:
            x -= LogExpMath.x8
            product = (product * LogExpMath.a8) // HUNDRED_WAD

        if x >= LogExpMath.x9:
            x -= LogExpMath.x9
            product = (product * LogExpMath.a9) // HUNDRED_WAD

        # x10 and x11 are unnecessary here since we have high enough precision already.

        # Now we need to compute e^x, where x is small (in particular, it is smaller than x9). We use the Taylor series
        # expansion for e^x: 1 + x + (x^2 / 2!) + (x^3 / 3!) + ... + (x^n / n!).

        series_sum = HUNDRED_WAD  # The initial one in the sum, with 20 decimal places.
        # Each term in the sum, where the nth term is (x^n / n!).

        # The first term is simply x.
        term = x
        series_sum += term

        # Each term (x^n / n!) equals the previous one times x, divided by n. Since x is a fixed point number,
        # multiplying by it requires dividing by HUNDRED_WAD, but dividing by the non-fixed point n values does not.
        term = (term * x) // HUNDRED_WAD // 2
        series_sum += term

        term = (term * x) // HUNDRED_WAD // 3
        series_sum += term

        term = (term * x) // HUNDRED_WAD // 4
        series_sum += term

        term = (term * x) // HUNDRED_WAD // 5
        series_sum += term

        term = (term * x) // HUNDRED_WAD // 6
        series_sum += term

        term = (term * x) // HUNDRED_WAD // 7
        series_sum += term

        term = (term * x) // HUNDRED_WAD // 8
        series_sum += term

        term = (term * x) // HUNDRED_WAD // 9
        series_sum += term

        term = (term * x) // HUNDRED_WAD // 10
        series_sum += term

        term = (term * x) // HUNDRED_WAD // 11
        series_sum += term

        term = (term * x) // HUNDRED_WAD // 12
        series_sum += term

        # // 12 Taylor terms are sufficient for 18 decimal precision.

        # // We now have the first a_n (with no decimals), and the product of all other a_n present, and the Taylor
        # // approximation of the exponentiation of the remainder (both with 20 decimals). All that remains is to multiply
        # // all three (one 20 decimal fixed point multiplication, dividing by HUNDRED_WAD, and one integer multiplication),
        # // and then drop two digits to return an 18 decimal value.
        return (((product * series_sum) // HUNDRED_WAD) * first_an) // 100

    @staticmethod
    def _ln_36(x_: int) -> int:
        x = x_
        # // Since ln(1) = 0, a value of x close to one will yield a very small result, which makes using 36 digits
        # // worthwhile.

        # // First, we transform x to a 36 digit fixed point value.
        x *= WAD

        # // We will use the following Taylor expansion, which converges very rapidly. z = (x - 1) / (x + 1).
        # // ln(x) = 2 * (z + z^3 / 3 + z^5 / 5 + z^7 / 7 + ... + z^(2 * n + 1) / (2 * n + 1))

        # // Recall that 36 digit fixed point division requires multiplying by ONE_36, and multiplication requires
        # // division by ONE_36.
        z = ((x - RAY) * RAY) // (x + RAY)
        z_squared = (z * z) // RAY

        # // num is the numerator of the series: the z^(2 * n + 1) term
        num = z

        # // seriesSum holds the accumulated sum of each term in the series, starting with the initial z
        series_sum = num

        # // In each step, the numerator is multiplied by z^2
        num = (num * z_squared) // RAY
        series_sum += num // 3

        num = (num * z_squared) // RAY
        series_sum += num // 5

        num = (num * z_squared) // RAY
        series_sum += num // 7

        num = (num * z_squared) // RAY
        series_sum += num // 9

        num = (num * z_squared) // RAY
        series_sum += num // 11

        num = (num * z_squared) // RAY
        series_sum += num // 13

        num = (num * z_squared) // RAY
        series_sum += num // 15

        # // 8 Taylor terms are sufficient for 36 decimal precision.

        # // All that remains is multiplying by 2 (non fixed point).
        return series_sum * 2

    @staticmethod
    def _ln(a_: int) -> int:
        a = a_
        if a < WAD:
            # // Since ln(a^k) = k * ln(a), we can compute ln(a) as ln(a) = ln((1/a)^(-1)) = - ln((1/a)). If a is less
            # // than one, 1/a will be greater than one, and MathSol if statement will not be entered in the recursive call.
            # // Fixed point division requires multiplying by MathSol.ONE_18.
            return -1 * LogExpMath._ln((WAD * WAD) // a)

        # // First, we use the fact that ln^(a * b) = ln(a) + ln(b) to decompose ln(a) into a sum of powers of two, which
        # // we call x_n, where x_n == 2^(7 - n), which are the natural logarithm of precomputed quantities a_n (that is,
        # // ln(a_n) = x_n). We choose the first x_n, x0, to equal 2^7 because the exponential of all larger powers cannot
        # // be represented as 18 fixed point decimal numbers in 256 bits, and are therefore larger than a.
        # // At the end of MathSol process we will have the sum of all x_n = ln(a_n) that apply, and the remainder of MathSol
        # // decomposition, which will be lower than the smallest a_n.
        # // ln(a) = k_0 * x_0 + k_1 * x_1 + ... + k_n * x_n + ln(remainder), where each k_n equals either 0 or 1.
        # // We mutate a by subtracting a_n, making it the remainder of the decomposition.

        # // For reasons related to how `exp` works, the first two a_n (e^(2^7) and e^(2^6)) are not stored as fixed point
        # // numbers with 18 decimals, but instead as plain integers with 0 decimals, so we need to multiply them by
        # // MathSol.ONE_18 to convert them to fixed point.
        # // For each a_n, we test if that term is present in the decomposition (if a is larger than it), and if so divide
        # // by it and compute the accumulated sum.

        sum_var = 0
        if a >= LogExpMath.a0 * WAD:
            a //= LogExpMath.a0  # Integer, not fixed point division
            sum_var += LogExpMath.x0

        if a >= LogExpMath.a1 * WAD:
            a //= LogExpMath.a1  # // Integer, not fixed point division
            sum_var += LogExpMath.x1

        # // All other a_n and x_n are stored as 20 digit fixed point numbers, so we convert the sum and a to MathSol format.
        sum_var *= 100
        a *= 100

        # // Because further a_n are  20 digit fixed point numbers, we multiply by ONE_20 when dividing by them.

        if a >= LogExpMath.a2:
            a = (a * HUNDRED_WAD) // LogExpMath.a2
            sum_var += LogExpMath.x2

        if a >= LogExpMath.a3:
            a = (a * HUNDRED_WAD) // LogExpMath.a3
            sum_var += LogExpMath.x3

        if a >= LogExpMath.a4:
            a = (a * HUNDRED_WAD) // LogExpMath.a4
            sum_var += LogExpMath.x4

        if a >= LogExpMath.a5:
            a = (a * HUNDRED_WAD) // LogExpMath.a5
            sum_var += LogExpMath.x5

        if a >= LogExpMath.a6:
            a = (a * HUNDRED_WAD) // LogExpMath.a6
            sum_var += LogExpMath.x6

        if a >= LogExpMath.a7:
            a = (a * HUNDRED_WAD) // LogExpMath.a7
            sum_var += LogExpMath.x7

        if a >= LogExpMath.a8:
            a = (a * HUNDRED_WAD) // LogExpMath.a8
            sum_var += LogExpMath.x8

        if a >= LogExpMath.a9:
            a = (a * HUNDRED_WAD) // LogExpMath.a9
            sum_var += LogExpMath.x9

        if a >= LogExpMath.a10:
            a = (a * HUNDRED_WAD) // LogExpMath.a10
            sum_var += LogExpMath.x10

        if a >= LogExpMath.a11:
            a = (a * HUNDRED_WAD) // LogExpMath.a11
            sum_var += LogExpMath.x11

        # // a is now a small number (smaller than a_11, which roughly equals 1.06). This means we can use a Taylor series
        # // that converges rapidly for values of `a` close to one - the same one used in ln_36.
        # // z = (a - 1) / (a + 1).
        # // ln(a) = 2 * (z + z^3 / 3 + z^5 / 5 + z^7 / 7 + ... + z^(2 * n + 1) / (2 * n + 1))

        # // Recall that 20 digit fixed point division requires multiplying by ONE_20, and multiplication requires
        # // division by ONE_20.
        z = ((a - HUNDRED_WAD) * HUNDRED_WAD) // (a + HUNDRED_WAD)
        z_squared = (z * z) // HUNDRED_WAD

        # // num is the numerator of the series: the z^(2 * n + 1) term
        num = z

        # // seriesSum holds the accumulated sum of each term in the series, starting with the initial z
        series_sum = num

        # // In each step, the numerator is multiplied by z^2
        num = (num * z_squared) // HUNDRED_WAD
        series_sum += num // 3

        num = (num * z_squared) // HUNDRED_WAD
        series_sum += num // 5

        num = (num * z_squared) // HUNDRED_WAD
        series_sum += num // 7

        num = (num * z_squared) // HUNDRED_WAD
        series_sum += num // 9

        num = (num * z_squared) // HUNDRED_WAD
        series_sum += num // 11

        # // 6 Taylor terms are sufficient for 36 decimal precision.

        # // Finally, we multiply by 2 (non fixed point) to compute ln(remainder)
        series_sum *= 2

        # // We now have the sum of all x_n present, and the Taylor approximation of the logarithm of the remainder (both
        # // with 20 decimals). All that remains is to sum these two, and then drop two digits to return a 18 decimal
        # // value.

        return (sum_var + series_sum) // 100

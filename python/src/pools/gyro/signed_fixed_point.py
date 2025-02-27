class FixedPointError(Exception):
    pass


class SignedFixedPoint:
    # Constants
    ONE = int("1000000000000000000")  # 1e18
    ONE_XP = int("100000000000000000000000000000000000000")  # 1e38

    @staticmethod
    def add(a: int, b: int) -> int:
        c = a + b
        if not (b >= 0 and c >= a or b < 0 and c < a):
            raise FixedPointError("AddOverflow")
        return c

    @classmethod
    def add_mag(cls, a: int, b: int) -> int:
        return cls.add(a, b) if a > 0 else cls.sub(a, b)

    @staticmethod
    def sub(a: int, b: int) -> int:
        c = a - b
        if not (b <= 0 and c >= a or b > 0 and c < a):
            raise FixedPointError("SubOverflow")
        return c

    @classmethod
    def mul_down_mag(cls, a: int, b: int) -> int:
        product = a * b
        if not (a == 0 or product // a == b):
            raise FixedPointError("MulOverflow")
        return product // cls.ONE

    @classmethod
    def mul_down_mag_u(cls, a: int, b: int) -> int:
        product = a * b
        result = abs(product) // cls.ONE
        return -result if product < 0 else result

    @classmethod
    def mul_up_mag(cls, a: int, b: int) -> int:
        product = a * b
        if not (a == 0 or product // a == b):
            raise FixedPointError("MulOverflow")

        if product > 0:
            return (product - 1) // cls.ONE + 1
        if product < 0:
            return (product + 1) // cls.ONE - 1
        return 0

    @classmethod
    def mul_up_mag_u(cls, a: int, b: int) -> int:
        product = a * b
        if product > 0:
            return (product - 1) // cls.ONE + 1
        if product < 0:
            return (product + 1) // cls.ONE - 1
        return 0

    @classmethod
    def div_down_mag(cls, a: int, b: int) -> int:
        if b == 0:
            raise FixedPointError("ZeroDivision")
        if a == 0:
            return 0

        a_inflated = a * cls.ONE
        if a_inflated // a != cls.ONE:
            raise FixedPointError("DivInterval")

        return a_inflated // b

    @classmethod
    def div_down_mag_u(cls, a: int, b: int) -> int:
        if b == 0:
            raise FixedPointError("ZeroDivision")

        # Implement truncating division (division toward zero)
        product = a * cls.ONE
        abs_result = abs(product) // abs(b)
        # Apply the correct sign
        return -abs_result if (product < 0) != (b < 0) else abs_result

    @classmethod
    def div_up_mag(cls, a: int, b: int) -> int:
        if b == 0:
            raise FixedPointError("ZeroDivision")
        if a == 0:
            return 0

        local_a = a
        local_b = b
        if b < 0:
            local_b = -b
            local_a = -a

        a_inflated = local_a * cls.ONE
        if a_inflated // local_a != cls.ONE:
            raise FixedPointError("DivInterval")

        if a_inflated > 0:
            return (a_inflated - 1) // local_b + 1
        return (a_inflated + 1) // local_b - 1

    @classmethod
    def div_up_mag_u(cls, a: int, b: int) -> int:
        if b == 0:
            raise FixedPointError("ZeroDivision")
        if a == 0:
            return 0

        local_a = a
        local_b = b
        if b < 0:
            local_b = -b
            local_a = -a

        if local_a > 0:
            return (local_a * cls.ONE - 1) // local_b + 1
        return (local_a * cls.ONE + 1) // local_b - 1

    @classmethod
    def mul_xp(cls, a: int, b: int) -> int:
        product = a * b
        if not (a == 0 or product // a == b):
            raise FixedPointError("MulOverflow")
        return product // cls.ONE_XP

    @classmethod
    def mul_xp_u(cls, a: int, b: int) -> int:
        return (a * b) // cls.ONE_XP

    @classmethod
    def div_xp(cls, a: int, b: int) -> int:
        if b == 0:
            raise FixedPointError("ZeroDivision")
        if a == 0:
            return 0

        a_inflated = a * cls.ONE_XP
        if a_inflated // a != cls.ONE_XP:
            raise FixedPointError("DivInterval")

        return a_inflated // b

    @classmethod
    def div_xp_u(cls, a: int, b: int) -> int:
        if b == 0:
            raise FixedPointError("ZeroDivision")
        return (a * cls.ONE_XP) // b

    @classmethod
    def mul_down_xp_to_np(cls, a: int, b: int) -> int:
        e_19 = int("10000000000000000000")
        b1 = b // e_19
        prod1 = a * b1
        if not (a == 0 or prod1 // a == b1):
            raise FixedPointError("MulOverflow")
        b2 = b % e_19
        prod2 = a * b2
        if not (a == 0 or prod2 // a == b2):
            raise FixedPointError("MulOverflow")
        return (
            (prod1 + prod2 // e_19) // e_19
            if prod1 >= 0 and prod2 >= 0
            else (prod1 + prod2 // e_19 + 1) // e_19 - 1
        )

    @classmethod
    def mul_down_xp_to_np_u(cls, a: int, b: int) -> int:
        e_19 = int("10000000000000000000")
        b1 = b // e_19
        b2 = b % e_19
        prod1 = a * b1
        prod2 = a * b2
        return (
            (prod1 + prod2 // e_19) // e_19
            if prod1 >= 0 and prod2 >= 0
            else (prod1 + prod2 // e_19 + 1) // e_19 - 1
        )

    @classmethod
    def mul_up_xp_to_np(cls, a: int, b: int) -> int:
        e_19 = int("10000000000000000000")
        b1 = b // e_19
        prod1 = a * b1
        if not (a == 0 or prod1 // a == b1):
            raise FixedPointError("MulOverflow")
        b2 = b % e_19
        prod2 = a * b2
        if not (a == 0 or prod2 // a == b2):
            raise FixedPointError("MulOverflow")
        return (
            (prod1 + prod2 // e_19) // e_19
            if prod1 <= 0 and prod2 <= 0
            else (prod1 + prod2 // e_19 - 1) // e_19 + 1
        )

    @classmethod
    def mul_up_xp_to_np_u(cls, a: int, b: int) -> int:
        e_19 = 10**19
        b1 = b // e_19
        b2 = b % e_19
        prod1 = a * b1
        prod2 = a * b2

        # For division, implement truncation toward zero (like Solidity)
        def trunc_div(x, y):
            result = abs(x) // abs(y)
            return -result if (x < 0) != (y < 0) else result

        if prod1 <= 0 and prod2 <= 0:
            return trunc_div(prod1 + trunc_div(prod2, e_19), e_19)
        else:
            return trunc_div(prod1 + trunc_div(prod2, e_19) - 1, e_19) + 1

    @classmethod
    def complement(cls, x: int) -> int:
        if x >= cls.ONE or x <= 0:
            return 0
        return cls.ONE - x

#  Simplified version of RayMath that instead of half-up rounding does explicit rounding in a specified direction.
#  This is needed to have a 4626 complient implementation, that always predictable rounds in favor of the vault / static a token.
RAY = 1000000000000000000000000000
WAD_RAY_RATIO = 1000000000


class RayMathExplicitRounding:
    @staticmethod
    def ray_mul_round_down(a: int, b: int) -> int:
        if a == 0 or b == 0:
            return 0
        return (a * b) // RAY

    @staticmethod
    def ray_mul_round_up(a: int, b: int) -> int:
        if a == 0 or b == 0:
            return 0
        return (a * b + RAY - 1) // RAY

    @staticmethod
    def ray_div_round_down(a: int, b: int) -> int:
        return (a * RAY) // b

    @staticmethod
    def ray_div_round_up(a: int, b: int) -> int:
        return (a * RAY + b - 1) // b

    @staticmethod
    def ray_to_wad_round_down(a: int) -> int:
        return a // WAD_RAY_RATIO

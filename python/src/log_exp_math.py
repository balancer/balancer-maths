import math

WAD = 10**18


class LogExpMath:
    @staticmethod
    def pow(x: int, y: int) -> int:
        if x == 0:
            return 0 if y > 0 else WAD
        if y == 0:
            return WAD

        # Calculate ln(x) in fixed-point
        ln_x = LogExpMath.ln(x)

        # Compute y * ln(x) (in fixed-point)
        y_ln_x = (y * ln_x) // WAD

        # Compute e^(y * ln(x)) in fixed-point
        return LogExpMath.exp(y_ln_x)

    @staticmethod
    def ln(x: int) -> int:
        # Fixed-point natural logarithm approximation
        # ln(x / WAD) -> ln(x) - ln(WAD)
        return int(WAD * math.log(x / WAD))

    @staticmethod
    def exp(x: int) -> int:
        # Fixed-point exponentiation approximation
        # e^(x / WAD) -> WAD * e^(x / WAD)
        return int(WAD * math.exp(x / WAD))

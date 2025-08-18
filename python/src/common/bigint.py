# This custom implementation of __floordiv__ ensures we match TS and Solidity behavior for int divisions,
# where we round towards zero instead of negative infinity
class BigInt(int):
    def __floordiv__(self, other):
        a = int(self)
        b = int(other)
        quotient = abs(a) // abs(b)
        return BigInt(quotient if (a * b) >= 0 else -quotient)

    def __rfloordiv__(self, other):
        a = int(other)
        b = int(self)
        quotient = abs(a) // abs(b)
        return BigInt(quotient if (a * b) >= 0 else -quotient)

    def __mod__(self, other):
        a = int(self)
        b = int(other)
        quotient = abs(a) // abs(b)
        quotient = quotient if (a * b) >= 0 else -quotient
        return BigInt(a - b * quotient)

    def __rmod__(self, other):
        a = int(other)
        b = int(self)
        quotient = abs(a) // abs(b)
        quotient = quotient if (a * b) >= 0 else -quotient
        return BigInt(a - b * quotient)

    def __mul__(self, other):
        return BigInt(int(self) * int(other))

    def __rmul__(self, other):
        return BigInt(int(other) * int(self))

    def __add__(self, other):
        return BigInt(int(self) + int(other))

    def __radd__(self, other):
        return BigInt(int(other) + int(self))

    def __sub__(self, other):
        return BigInt(int(self) - int(other))

    def __rsub__(self, other):
        return BigInt(int(other) - int(self))

    def __neg__(self):
        return BigInt(-int(self))

    def __abs__(self):
        return BigInt(abs(int(self)))

    # Comparison operators
    def __lt__(self, other):
        return int(self) < int(other)

    def __le__(self, other):
        return int(self) <= int(other)

    def __eq__(self, other):
        return int(self) == int(other)

    def __ne__(self, other):
        return int(self) != int(other)

    def __gt__(self, other):
        return int(self) > int(other)

    def __ge__(self, other):
        return int(self) >= int(other)

    # Power operator
    def __pow__(self, other, modulo=None):
        if modulo is None:
            return BigInt(int(self) ** int(other))
        return BigInt(pow(int(self), int(other), int(modulo)))

    def __rpow__(self, other):
        return BigInt(int(other) ** int(self))

    # In-place operators
    def __iadd__(self, other):
        return BigInt(int(self) + int(other))

    def __isub__(self, other):
        return BigInt(int(self) - int(other))

    def __imul__(self, other):
        return BigInt(int(self) * int(other))

    def __ifloordiv__(self, other):
        a = int(self)
        b = int(other)
        quotient = abs(a) // abs(b)
        return BigInt(quotient if (a * b) >= 0 else -quotient)

    def __imod__(self, other):
        a = int(self)
        b = int(other)
        quotient = abs(a) // abs(b)
        quotient = quotient if (a * b) >= 0 else -quotient
        return BigInt(a - b * quotient)

    def __ipow__(self, other, modulo=None):
        if modulo is None:
            return BigInt(int(self) ** int(other))
        return BigInt(pow(int(self), int(other), int(modulo)))

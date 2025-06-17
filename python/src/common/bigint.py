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

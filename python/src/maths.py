def mul_up_fixed(a: int, b: int) -> int:
    product = a * b
    if product == 0:
        return 0
    return (product - 1) / 10**18 + 1


def mul_down_fixed(a: int, b: int) -> int:
    product = a * b
    return product / 10**18


def div_down_fixed(a: int, b: int) -> int:
    if a == 0:
        return 0

    a_inflated = a * 10**18
    return a_inflated / b


def div_up_fixed(a: int, b: int) -> int:
    if a == 0:
        return 0

    a_inflated = a * 10**18
    return (a_inflated - 1) / b + 1

from src.common.constants import WAD
from src.common.maths import (
    complement_fixed,
    div_down_fixed,
    div_up_fixed,
    mul_down_fixed,
    mul_up_fixed,
    pow_down_fixed,
    pow_up_fixed,
)

# Pool limits that arise from limitations in the fixed point power function (and the imposed 1:100 maximum weight
# ratio).

# Swap limits: amounts swapped may not be larger than this percentage of the total balance.
_MAX_IN_RATIO = int(0.3e18)
_MAX_OUT_RATIO = int(0.3e18)

# Invariant growth limit: non-proportional joins cannot cause the invariant to increase by more than this ratio.
_MAX_INVARIANT_RATIO = int(3e18)
# Invariant shrink limit: non-proportional exits cannot cause the invariant to decrease by less than this ratio.
_MIN_INVARIANT_RATIO = int(0.7e18)

# About swap fees on joins and exits:
# Any join or exit that is not perfectly balanced (e.g. all single token joins or exits) is mathematically
# equivalent to a perfectly balanced join or exit followed by a series of swaps. Since these swaps would charge
# swap fees, it follows that (some) joins and exits should as well.
# On these operations, we split the token amounts in 'taxable' and 'non-taxable' portions, where the 'taxable' part
# is the one to which swap fees are applied.


# Invariant is used to collect protocol swap fees by comparing its value between two times.
# So we can round always to the same direction. It is also used to initiate the BPT amount
# and, because there is a minimum BPT, we round down the invariant.
def compute_invariant_down(normalized_weights: list[int], balances: list[int]) -> int:
    # **********************************************************************************************
    #  invariant               _____
    #  wi = weight index i      | |      wi
    #  bi = balance index i     | |  bi ^   = i
    #  i = invariant
    # **********************************************************************************************

    invariant = WAD
    for i in range(len(normalized_weights)):
        invariant = mul_down_fixed(
            invariant,
            pow_down_fixed(balances[i], normalized_weights[i]),
        )

    if invariant == 0:
        raise ValueError("ZeroInvariant")

    return invariant


def compute_invariant_up(normalized_weights: list[int], balances: list[int]) -> int:
    # **********************************************************************************************
    #  invariant               _____
    #  wi = weight index i      | |      wi
    #  bi = balance index i     | |  bi ^   = i
    #  i = invariant
    # **********************************************************************************************

    invariant = WAD
    for i in range(len(normalized_weights)):
        invariant = mul_up_fixed(
            invariant,
            pow_up_fixed(balances[i], normalized_weights[i]),
        )

    if invariant == 0:
        raise ValueError("ZeroInvariant")

    return invariant


def compute_out_given_exact_in(
    balance_in: int, weight_in: int, balance_out: int, weight_out: int, amount_in: int
) -> int:
    # **********************************************************************************************
    #  outGivenExactIn
    #  aO = amountOut
    #  bO = balanceOut
    #  bI = balanceIn              /      /            bI             \    (wI / wO) \
    #  aI = amountIn    aO = bO * |  1 - | --------------------------  | ^            |
    #  wI = weightIn               \      \       ( bI + aI )         /              /
    #  wO = weightOut
    # **********************************************************************************************

    if amount_in > mul_down_fixed(balance_in, _MAX_IN_RATIO):
        raise ValueError("MaxInRatio exceeded")

    denominator = balance_in + amount_in
    base = div_up_fixed(balance_in, denominator)
    exponent = div_down_fixed(weight_in, weight_out)
    power = pow_up_fixed(base, exponent)

    # Because of rounding up, power can be greater than one. Using complement prevents reverts.
    return mul_down_fixed(balance_out, complement_fixed(power))


def compute_in_given_exact_out(
    balance_in: int, weight_in: int, balance_out: int, weight_out: int, amount_out: int
) -> int:
    # **********************************************************************************************
    #  inGivenExactOut
    #  aO = amountOut
    #  bO = balanceOut
    #  bI = balanceIn              /  /            bO             \    (wO / wI)      \
    #  aI = amountIn    aI = bI * |  | --------------------------  | ^            - 1  |
    #  wI = weightIn               \  \       ( bO - aO )         /                   /
    #  wO = weightOut
    # **********************************************************************************************
    if amount_out > mul_down_fixed(balance_out, _MAX_OUT_RATIO):
        raise ValueError("MaxOutRatio exceeded")

    base = div_up_fixed(balance_out, balance_out - amount_out)
    exponent = div_up_fixed(weight_out, weight_in)
    power = pow_up_fixed(base, exponent)

    # Because the base is larger than one (and the power rounds up), the power should always be larger than one, so
    # the following subtraction should never revert.
    ratio = power - WAD

    return mul_up_fixed(balance_in, ratio)


def compute_balance_out_given_invariant(
    current_balance: int,
    weight: int,
    invariant_ratio: int,
) -> int:
    # /******************************************************************************************
    # // calculateBalanceGivenInvariant                                                       //
    # // o = balanceOut                                                                        //
    # // b = balanceIn                      (1 / w)                                            //
    # // w = weight              o = b * i ^                                                   //
    # // i = invariantRatio                                                                    //
    # ******************************************************************************************/

    # Rounds result up overall.
    # Calculate by how much the token balance has to increase to match the invariantRatio.
    balance_ratio = pow_up_fixed(
        invariant_ratio,
        div_up_fixed(WAD, weight),
    )

    return mul_up_fixed(current_balance, balance_ratio)

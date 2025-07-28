from src.common.maths import div_up

# For security reasons, to help ensure that for all possible "round trip" paths
# the caller always receives the same or fewer tokens than supplied,
# we have chosen the rounding direction to favor the protocol in all cases.
AMP_PRECISION = int(1000)

# Invariant growth limit: non-proportional add cannot cause the invariant to increase by more than this ratio.
_MIN_INVARIANT_RATIO = int(60e16)  # 60%
# Invariant shrink limit: non-proportional remove cannot cause the invariant to decrease by less than this ratio.
_MAX_INVARIANT_RATIO = int(500e16)  # 500%


def compute_invariant(amplification_parameter: int, balances: list[int]) -> int:
    """
    Calculate the invariant for the stable swap curve.

    :param amplification_parameter: The amplification parameter A.
    :param balances: A list of balances for each token in the pool.
    :return: The invariant D.
    """
    # Calculate the sum of balances
    total_balance = sum(balances)
    num_tokens = len(balances)

    if total_balance == int(0):
        return int(0)

    # Initial invariant and amplification
    prev_invariant = int(0)
    invariant = total_balance
    amp_times_total = amplification_parameter * num_tokens

    # Iteratively compute the invariant
    for _ in range(255):
        d_p = invariant

        for balance in balances:
            d_p = (d_p * invariant) // (balance * num_tokens)

        prev_invariant = invariant
        invariant = (
            ((amp_times_total * total_balance) // AMP_PRECISION + d_p * num_tokens)
            * invariant
        ) // (
            ((amp_times_total - AMP_PRECISION) * invariant) // AMP_PRECISION
            + (num_tokens + 1) * d_p
        )

        # Check for convergence
        if invariant > prev_invariant:
            if invariant - prev_invariant <= 1:
                return invariant
        else:
            if prev_invariant - invariant <= 1:
                return invariant

    raise RuntimeError("StableInvariantDidntConverge()")


def compute_out_given_exact_in(
    amplification_parameter: int,
    balances: list[int],
    token_index_in: int,
    token_index_out: int,
    token_amount_in: int,
    invariant: int,
) -> int:
    """
    Compute how many tokens can be taken out of a pool if
    `token_amount_in` are sent, given the current balances.

    :param amplification_parameter: The amplification parameter A.
    :param balances: A list of balances for each token in the pool.
    :param token_index_in: The index of the token being sent in.
    :param token_index_out: The index of the token being taken out.
    :param token_amount_in: The amount of the input token.
    :param invariant: The invariant D.
    :return: The amount of tokens that can be taken out.
    """
    # Add the token amount to the input balance
    balances[token_index_in] += token_amount_in

    # Calculate the final balance out using a helper function
    final_balance_out = compute_balance(
        amplification_parameter,
        balances,
        invariant,
        token_index_out,
    )

    # Restore the original balance of the input token
    balances[token_index_in] -= token_amount_in

    # Calculate and return the amount of tokens out, rounding down
    return balances[token_index_out] - final_balance_out - 1


def compute_in_given_exact_out(
    amplification_parameter: int,
    balances: list[int],
    token_index_in: int,
    token_index_out: int,
    token_amount_out: int,
    invariant: int,
) -> int:
    """
    Compute how many tokens can be taken out of a pool if
    `token_amount_in` are sent, given the current balances.

    :param amplification_parameter: The amplification parameter A.
    :param balances: A list of balances for each token in the pool.
    :param token_index_in: The index of the token being sent in.
    :param token_index_out: The index of the token being taken out.
    :param token_amount_out: The amount of the output token.
    :param invariant: The invariant D.
    :return: The amount of tokens that will be in.
    """
    # Amount in, so we round up overall.
    balances[token_index_out] -= token_amount_out

    final_balance_in = compute_balance(
        amplification_parameter,
        balances,
        invariant,
        token_index_in,
    )

    # No need to use checked arithmetic since `tokenAmountOut`
    # was actually subtracted from the same balance right
    # before calling `_getTokenBalanceGivenInvariantAndAllOtherBalances`
    # which doesn't alter the balances array.
    balances[token_index_out] += token_amount_out

    return final_balance_in - balances[token_index_in] + 1


# This function calculates the balance of a given token (tokenIndex)
# given all the other balances and the invariant.
def compute_balance(
    amplification_parameter: int,
    balances: list[int],
    invariant: int,
    token_index: int,
) -> int:
    """
    Calculate the balance of a given token (tokenIndex)
    given all the other balances and the invariant.

    :param amplification_parameter: The amplification parameter A.
    :param balances: A list of balances for each token in the pool.
    :param invariant: The invariant D.
    :param token_index: The index of the token for which the balance is computed.
    :return: The calculated balance for the token.
    """
    # Calculate ampTimesTotal and initial sum and P_D
    num_tokens = len(balances)
    amp_times_total = amplification_parameter * num_tokens
    sum_balances = balances[0]
    p_d = balances[0] * num_tokens

    for j in range(1, num_tokens):
        p_d = (p_d * balances[j] * num_tokens) // invariant
        sum_balances += balances[j]

    sum_balances -= balances[token_index]

    # Calculate inv2 and c
    inv2 = invariant * invariant

    c = div_up(inv2 * AMP_PRECISION, amp_times_total * p_d) * balances[token_index]
    b = sum_balances + (invariant * AMP_PRECISION) // amp_times_total
    # Initial approximation of tokenBalance
    prev_token_balance = int(0)
    token_balance = div_up(inv2 + c, invariant + b)

    # Iteratively solve for tokenBalance
    for _ in range(255):
        prev_token_balance = token_balance
        token_balance = div_up(
            token_balance * token_balance + c, token_balance * int(2) + b - invariant
        )

        # Check for convergence
        if token_balance > prev_token_balance:
            if token_balance - prev_token_balance <= 1:
                return token_balance
        elif prev_token_balance - token_balance <= 1:
            return token_balance

    raise RuntimeError("StableGetBalanceDidntConverge()")

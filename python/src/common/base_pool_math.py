from dataclasses import dataclass
from typing import Callable

from src.common.bigint import BigInt
from src.common.maths import (
    Rounding,
    complement_fixed,
    div_down_fixed,
    div_up_fixed,
    mul_div_up_fixed,
    mul_down_fixed,
    mul_up_fixed,
)


@dataclass
class AddLiquidityUnbalancedResult:
    bpt_amount_out: int
    swap_fee_amounts: list[int]


@dataclass
class AddLiquiditySingleTokenExactOutResult:
    amount_in_with_fee: int
    swap_fee_amounts: list[int]


@dataclass
class RemoveLiquiditySingleTokenExactInResult:
    amount_out_with_fee: int
    swap_fee_amounts: list[int]


@dataclass
class RemoveLiquiditySingleTokenExactOutResult:
    bpt_amount_in: int
    swap_fee_amounts: list[int]


def compute_add_liquidity_unbalanced(
    current_balances: list[int],
    exact_amounts: list[int],
    total_supply: int,
    swap_fee_percentage: int,
    max_invariant_ratio: int,
    compute_invariant: Callable[[list[int], Rounding], int],
) -> AddLiquidityUnbalancedResult:
    # /***********************************************************************
    # //                                                                    //
    # // s = total_supply                                 (iFees - iCur)     //
    # // b = tokenBalance                  bptOut = s *  --------------     //
    # // bptOut = bptamount_out                                iCur          //
    # // iFees = invariantWithFeesApplied                                   //
    # // iCur = currentInvariant                                            //
    # // iNew = newInvariant                                                //
    # ***********************************************************************/

    # Determine the number of tokens in the pool.
    num_tokens = len(current_balances)

    # Create a new array to hold the updated balances after the addition.
    new_balances = [0] * num_tokens
    # Create a new array to hold the swap fee amount for each token.
    swap_fee_amounts = [0] * num_tokens

    # Loop through each token, updating the balance with the added amount.
    for index, balance in enumerate(current_balances):
        new_balances[index] = balance + exact_amounts[index] - 1

    # Calculate the invariant using the current balances (before the addition).
    current_invariant = compute_invariant(current_balances, Rounding.ROUND_UP)

    # Calculate the new invariant using the new balances (after the addition).
    new_invariant = compute_invariant(new_balances, Rounding.ROUND_DOWN)

    # Calculate the new invariant ratio by dividing the new invariant by the old invariant.
    invariant_ratio = div_down_fixed(new_invariant, current_invariant)

    # Add check for max invariant ratio
    if invariant_ratio > max_invariant_ratio:
        raise ValueError(
            f"InvariantRatioAboveMax {invariant_ratio} {max_invariant_ratio}"
        )

    # Loop through each token to apply fees if necessary.
    for index, current_balance in enumerate(current_balances):
        # // Check if the new balance is greater than the equivalent proportional balance.
        # // If so, calculate the taxable amount, rounding in favor of the protocol.
        # // We round the second term down to subtract less and get a higher `taxableAmount`,
        # // which charges higher swap fees. This will lower `newBalances`, which in turn lowers
        # // `invariantWithFeesApplied` below.
        proportional_token_balance = mul_down_fixed(invariant_ratio, current_balance)

        if new_balances[index] > proportional_token_balance:
            taxable_amount = new_balances[index] - proportional_token_balance
            # Calculate fee amount
            swap_fee_amounts[index] = mul_up_fixed(taxable_amount, swap_fee_percentage)
            # Subtract the fee from the new balance.
            # We are essentially imposing swap fees on non-proportional incoming amounts.
            new_balances[index] = new_balances[index] - swap_fee_amounts[index]

    # Calculate the new invariant with fees applied.
    invariant_with_fees_applied = compute_invariant(new_balances, Rounding.ROUND_DOWN)

    # // Calculate the amount of BPT to mint. This is done by multiplying the
    # // total supply with the ratio of the change in invariant.
    # // Since we multiply and divide we don't need to use FP math.
    # // Round down since we're calculating BPT amount out. This is the most important result of this function,
    # // equivalent to:
    # // `totalSupply * (invariantWithFeesApplied / currentInvariant - 1)`

    # // Then, to round `bptAmountOut` down we use `invariantWithFeesApplied` rounded down and `currentInvariant`
    # // rounded up.
    # // If rounding makes `invariantWithFeesApplied` smaller or equal to `currentInvariant`, this would effectively
    # // be a donation. In that case we just let checked math revert for simplicity; it's not a valid use-case to
    # // support at this point.
    bpt_amount_out = int(
        BigInt(total_supply)
        * BigInt(invariant_with_fees_applied - current_invariant)
        // BigInt(current_invariant)
    )

    return AddLiquidityUnbalancedResult(
        bpt_amount_out=bpt_amount_out, swap_fee_amounts=swap_fee_amounts
    )


# /**
#  * @notice Computes the amount of pool tokens to burn to receive exact amount out.
#  * @param current_balances Current pool balances, in token registration order
#  * @param token_out_index Index of the token to receive in exchange for pool tokens burned
#  * @param exact_amount_out Exact amount of tokens to receive
#  * @param total_supply Current total supply of the pool tokens (BPT)
#  * @param swap_fee_percentage The swap fee percentage applied to the taxable amount
#  * @return bptAmountIn Amount of pool tokens to burn
#  * @return swap_fee_amounts The amount of swap fees charged for each token
#  */
def compute_add_liquidity_single_token_exact_out(
    current_balances: list[int],
    token_in_index: int,
    exact_bpt_amount_out: int,
    total_supply: int,
    swap_fee_percentage: int,
    max_invariant_ratio: int,
    compute_balance: Callable[[list[int], int, int], int],
) -> AddLiquiditySingleTokenExactOutResult:
    # Calculate new supply after minting exactBptamount_out
    new_supply = exact_bpt_amount_out + total_supply

    invariant_ratio = div_up_fixed(new_supply, total_supply)
    # Add check for max invariant ratio
    if invariant_ratio > max_invariant_ratio:
        raise ValueError(
            f"InvariantRatioAboveMax {invariant_ratio} {max_invariant_ratio}"
        )

    # Calculate the initial amount of the input token needed for the desired amount of BPT out
    # "divUp" leads to a higher "new_balance," which in turn results in a larger "amountIn."
    # This leads to receiving more tokens for the same amount of BTP minted.
    new_balance = compute_balance(current_balances, token_in_index, invariant_ratio)
    amount_in = new_balance - current_balances[token_in_index]

    # Calculate the taxable amount, which is the difference
    # between the actual amount in and the non-taxable balance
    non_taxable_balance = div_down_fixed(
        mul_down_fixed(new_supply, current_balances[token_in_index]), total_supply
    )

    taxable_amount = amount_in + current_balances[token_in_index] - non_taxable_balance

    # Calculate the swap fee based on the taxable amount and the swap fee percentage
    fee = (
        div_up_fixed(taxable_amount, complement_fixed(swap_fee_percentage))
        - taxable_amount
    )

    # Create swap fees amount array and set the single fee we charge
    swap_fee_amounts = [0] * len(current_balances)
    swap_fee_amounts[token_in_index] = fee

    # Return the total amount of input token needed, including the swap fee
    amount_in_with_fee = amount_in + fee
    return AddLiquiditySingleTokenExactOutResult(
        amount_in_with_fee=amount_in_with_fee,
        swap_fee_amounts=swap_fee_amounts,
    )


# /**
#  * @notice Computes the proportional amounts of tokens to be withdrawn from the pool.
#  * @dev This function computes the amount of each token that will be withdrawn in exchange for burning
#  * a specific amount of pool tokens (BPT). It ensures that the amounts of tokens withdrawn are proportional
#  * to the current pool balances.
#  *
#  * Calculation: For each token, amount_out = balance * (bptAmountIn / bpttotal_supply).
#  * Rounding down is used to prevent withdrawing more than the pool can afford.
#  *
#  * @param balances Array of current token balances in the pool.
#  * @param bpttotal_supply Total supply of the pool tokens (BPT).
#  * @param bptAmountIn The amount of pool tokens that will be burned.
#  * @return amountsOut Array of amounts for each token to be withdrawn.
#  */
def compute_proportional_amounts_out(
    balances: list[int],
    bpt_total_supply: int,
    bpt_amount_in: int,
) -> list[int]:
    # /**********************************************************************************************
    # // computeProportionalAmountsOut                                                             //
    # // (per token)                                                                               //
    # // aO = tokenamount_out             /        bptIn         \                                  //
    # // b = tokenBalance      a0 = b * | ---------------------  |                                 //
    # // bptIn = bptAmountIn             \     bpttotal_supply    /                                 //
    # // bpt = bpttotal_supply                                                                      //
    # **********************************************************************************************/

    # // Create a new array to hold the amounts of each token to be withdrawn.
    amounts_out = [0] * len(balances)
    for index, balance in enumerate(balances):
        # // Since we multiply and divide we don't need to use FP math.
        # // Round down since we're calculating amounts out.
        amounts_out[index] = int(
            BigInt(balance) * BigInt(bpt_amount_in) // BigInt(bpt_total_supply)
        )
    return amounts_out


# /**
#  * @notice Computes the amount of a single token to withdraw for a given amount of BPT to burn.
#  * @dev It computes the output token amount for an exact input of BPT, considering current balances,
#  * total supply, and swap fees.
#  *
#  * @param current_balances The current token balances in the pool.
#  * @param token_out_index The index of the token to be withdrawn.
#  * @param exactBptAmountIn The exact amount of BPT the user wants to burn.
#  * @param total_supply The total supply of BPT in the pool.
#  * @param swap_fee_percentage The swap fee percentage applied to the taxable amount.
#  * @param compute_balance A function pointer to the balance calculation function.
#  * @return amount_out_with_fee The amount of the output token the user receives, accounting for swap fees.
#  */
def compute_remove_liquidity_single_token_exact_in(
    current_balances: list[int],
    token_out_index: int,
    exact_bpt_amount_in: int,
    total_supply: int,
    swap_fee_percentage: int,
    min_invariant_ratio: int,
    compute_balance: Callable[[list[int], int, int], int],
) -> RemoveLiquiditySingleTokenExactInResult:
    # // Calculate new supply accounting for burning exactBptAmountIn
    new_supply = total_supply - exact_bpt_amount_in

    invariant_ratio = div_up_fixed(new_supply, total_supply)
    # Add check for min invariant ratio
    if invariant_ratio < min_invariant_ratio:
        raise ValueError(
            f"InvariantRatioBelowMin {invariant_ratio} {min_invariant_ratio}"
        )

    # // Calculate the new balance of the output token after the BPT burn.
    # // "divUp" leads to a higher "new_balance," which in turn results in a lower "amount_out."
    # // This leads to giving less tokens for the same amount of BTP burned.
    new_balance = compute_balance(
        current_balances,
        token_out_index,
        invariant_ratio,
    )

    # // Compute the amount to be withdrawn from the pool.
    amount_out = current_balances[token_out_index] - new_balance

    new_balance_before_tax = mul_div_up_fixed(
        new_supply, current_balances[token_out_index], total_supply
    )

    # // Compute the taxable amount: the difference between the non-taxable balance and actual withdrawal.
    taxable_amount = new_balance_before_tax - new_balance

    # // Calculate the swap fee on the taxable amount.
    fee = mul_up_fixed(taxable_amount, swap_fee_percentage)

    # // Create swap fees amount array and set the single fee we charge
    swap_fee_amounts = [0] * len(current_balances)
    swap_fee_amounts[token_out_index] = fee

    # // Return the net amount after subtracting the fee.
    amount_out_with_fee = amount_out - fee
    return RemoveLiquiditySingleTokenExactInResult(
        amount_out_with_fee=amount_out_with_fee,
        swap_fee_amounts=swap_fee_amounts,
    )


# /**
#  * @notice Computes the amount of pool tokens to burn to receive exact amount out.
#  * @param current_balances Current pool balances, in token registration order
#  * @param token_out_index Index of the token to receive in exchange for pool tokens burned
#  * @param exact_amount_out Exact amount of tokens to receive
#  * @param total_supply Current total supply of the pool tokens (BPT)
#  * @param swap_fee_percentage The swap fee percentage applied to the taxable amount
#  * @return bptAmountIn Amount of pool tokens to burn
#  * @return swap_fee_amounts The amount of swap fees charged for each token
#  */
def compute_remove_liquidity_single_token_exact_out(
    current_balances: list[int],
    token_out_index: int,
    exact_amount_out: int,
    total_supply: int,
    swap_fee_percentage: int,
    min_invariant_ratio: int,
    compute_invariant: Callable[[list[int], Rounding], int],
) -> RemoveLiquiditySingleTokenExactOutResult:
    # // Determine the number of tokens in the pool.
    num_tokens = len(current_balances)

    # // Create a new array to hold the updated balances.
    new_balances = [0] * num_tokens

    # // Copy current_balances to new_balances
    for index, current_balance in enumerate(current_balances):
        new_balances[index] = current_balance - 1

    # // Update the balance of token_out_index with exact_amount_out.
    new_balances[token_out_index] = new_balances[token_out_index] - exact_amount_out

    # // Calculate the invariant using the current balances.
    current_invariant = compute_invariant(current_balances, Rounding.ROUND_UP)

    invariant_ratio = div_up_fixed(
        compute_invariant(new_balances, Rounding.ROUND_UP), current_invariant
    )

    # Add check for min invariant ratio
    if invariant_ratio < min_invariant_ratio:
        raise ValueError(
            f"InvariantRatioBelowMin {invariant_ratio} {min_invariant_ratio}"
        )

    # Taxable amount is proportional to invariant ratio; a larger taxable amount rounds in the Vault's favor.
    taxable_amount = (
        mul_up_fixed(
            invariant_ratio,
            current_balances[token_out_index],
        )
        - new_balances[token_out_index]
    )

    fee = (
        div_up_fixed(
            taxable_amount,
            complement_fixed(swap_fee_percentage),
        )
        - taxable_amount
    )

    # // Update new balances array with a fee
    new_balances[token_out_index] = new_balances[token_out_index] - fee

    # // Calculate the new invariant with fees applied.
    invariant_with_fees_applied = compute_invariant(new_balances, Rounding.ROUND_DOWN)

    # // Create swap fees amount array and set the single fee we charge
    swap_fee_amounts = [0] * num_tokens
    swap_fee_amounts[token_out_index] = fee
    # // Calculate the amount of BPT to burn. This is done by multiplying the total supply by the ratio of the
    # // invariant delta to the current invariant.
    # //
    # // Calculating BPT amount in, so we round up. This is the most important result of this function, equivalent to:
    # // `totalSupply * (1 - invariantWithFeesApplied / currentInvariant)`.
    # // Then, to round `bptAmountIn` up we use `invariantWithFeesApplied` rounded down and `currentInvariant`
    # // rounded up.
    # //
    # // Since `currentInvariant` is rounded up and `invariantWithFeesApplied` is rounded down, the difference
    # // should always be positive. The checked math will revert if that is not the case.
    bpt_amount_in = mul_div_up_fixed(
        total_supply, current_invariant - invariant_with_fees_applied, current_invariant
    )

    return RemoveLiquiditySingleTokenExactOutResult(
        bpt_amount_in=bpt_amount_in,
        swap_fee_amounts=swap_fee_amounts,
    )

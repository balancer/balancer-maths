from src.maths import (
    mul_down_fixed,
    div_down_fixed,
    mul_up_fixed,
    div_up_fixed,
    complement_fixed,
)


def compute_add_liquidity_unbalanced(
    current_balances,
    exact_amounts,
    total_supply,
    swap_fee_percentage,
    compute_invariant,
):
    # /***********************************************************************
    # //                                                                    //
    # // s = totalSupply                                 (iFees - iCur)     //
    # // b = tokenBalance                  bptOut = s *  --------------     //
    # // bptOut = bptAmountOut                                iCur          //
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
    for index in range(len(current_balances)):
        new_balances[index] = current_balances[index] + exact_amounts[index]

    # Calculate the invariant using the current balances (before the addition).
    current_invariant = compute_invariant(current_balances)

    # Calculate the new invariant using the new balances (after the addition).
    new_invariant = compute_invariant(new_balances)

    # Calculate the new invariant ratio by dividing the new invariant by the old invariant.
    invariant_ratio = div_down_fixed(new_invariant, current_invariant)

    # Loop through each token to apply fees if necessary.
    for index in range(len(current_balances)):
        # Check if the new balance is greater than the proportional balance.
        # If so, calculate the taxable amount.
        if new_balances[index] > mul_up_fixed(invariant_ratio, current_balances[index]):
            taxable_amount = new_balances[index] - mul_up_fixed(
                invariant_ratio, current_balances[index]
            )
            # Calculate fee amount
            swap_fee_amounts[index] = mul_up_fixed(taxable_amount, swap_fee_percentage)
            # Subtract the fee from the new balance.
            # We are essentially imposing swap fees on non-proportional incoming amounts.
            new_balances[index] = new_balances[index] - swap_fee_amounts[index]

    # Calculate the new invariant with fees applied.
    invariant_with_fees_applied = compute_invariant(new_balances)

    # Calculate the amount of BPT to mint. This is done by multiplying the
    # total supply with the ratio of the change in invariant.
    bpt_amount_out = mul_down_fixed(
        total_supply,
        div_down_fixed(
            invariant_with_fees_applied - current_invariant, current_invariant
        ),
    )

    return {"bpt_amount_out": bpt_amount_out, "swap_fee_amounts": swap_fee_amounts}


# /**
#  * @notice Computes the amount of pool tokens to burn to receive exact amount out.
#  * @param currentBalances Current pool balances, in token registration order
#  * @param tokenOutIndex Index of the token to receive in exchange for pool tokens burned
#  * @param exactAmountOut Exact amount of tokens to receive
#  * @param totalSupply Current total supply of the pool tokens (BPT)
#  * @param swapFeePercentage The swap fee percentage applied to the taxable amount
#  * @return bptAmountIn Amount of pool tokens to burn
#  * @return swapFeeAmounts The amount of swap fees charged for each token
#  */
def compute_add_liquidity_single_token_exact_out(
    current_balances,
    token_in_index,
    exact_bpt_amount_out,
    total_supply,
    swap_fee_percentage,
    compute_balance,
):
    # Calculate new supply after minting exactBptAmountOut
    new_supply = exact_bpt_amount_out + total_supply

    # Calculate the initial amount of the input token needed for the desired amount of BPT out
    # "divUp" leads to a higher "newBalance," which in turn results in a larger "amountIn."
    # This leads to receiving more tokens for the same amount of BTP minted.
    new_balance = compute_balance(
        current_balances, token_in_index, div_up_fixed(new_supply, total_supply)
    )
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
    return {
        "amount_in_with_fee": amount_in_with_fee,
        "swap_fee_amounts": swap_fee_amounts,
    }

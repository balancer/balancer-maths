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
#  * @param current_balances Current pool balances, in token registration order
#  * @param token_out_index Index of the token to receive in exchange for pool tokens burned
#  * @param exact_amount_out Exact amount of tokens to receive
#  * @param total_supply Current total supply of the pool tokens (BPT)
#  * @param swap_fee_percentage The swap fee percentage applied to the taxable amount
#  * @return bptAmountIn Amount of pool tokens to burn
#  * @return swap_fee_amounts The amount of swap fees charged for each token
#  */
def compute_add_liquidity_single_token_exact_out(
    current_balances,
    token_in_index,
    exact_bpt_amount_out,
    total_supply,
    swap_fee_percentage,
    compute_balance,
):
    # Calculate new supply after minting exactBptamount_out
    new_supply = exact_bpt_amount_out + total_supply

    # Calculate the initial amount of the input token needed for the desired amount of BPT out
    # "divUp" leads to a higher "new_balance," which in turn results in a larger "amountIn."
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
    balances,
    bpt_total_supply,
    bpt_amount_in,
):
    # /**********************************************************************************************
    # // computeProportionalAmountsOut                                                             //
    # // (per token)                                                                               //
    # // aO = tokenamount_out             /        bptIn         \                                  //
    # // b = tokenBalance      a0 = b * | ---------------------  |                                 //
    # // bptIn = bptAmountIn             \     bpttotal_supply    /                                 //
    # // bpt = bpttotal_supply                                                                      //
    # **********************************************************************************************/

    # // Since we're computing an amount out, we round down overall. This means rounding down on both the
    # // multiplication and division.

    bpt_ratio = div_down_fixed(bpt_amount_in, bpt_total_supply)

    amounts_out = [0] * len(balances)
    for index in range(len(balances)):
        amounts_out[index] = mul_down_fixed(balances[index], bpt_ratio)
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
    current_balances,
    token_out_index,
    exact_bpt_amount_in,
    total_supply,
    swap_fee_percentage,
    compute_balance,
):
    # // Calculate new supply accounting for burning exactBptAmountIn
    new_supply = total_supply - exact_bpt_amount_in
    # // Calculate the new balance of the output token after the BPT burn.
    # // "divUp" leads to a higher "new_balance," which in turn results in a lower "amount_out."
    # // This leads to giving less tokens for the same amount of BTP burned.
    new_balance = compute_balance(
        current_balances,
        token_out_index,
        div_up_fixed(new_supply, total_supply),
    )

    # // Compute the amount to be withdrawn from the pool.
    amount_out = current_balances[token_out_index] - new_balance

    # // Calculate the non-taxable balance proportionate to the BPT burnt.
    non_taxable_balance = div_up_fixed(
        mul_up_fixed(new_supply, current_balances[token_out_index]),
        total_supply,
    )

    # // Compute the taxable amount: the difference between the non-taxable balance and actual withdrawal.
    taxable_amount = non_taxable_balance - new_balance

    # // Calculate the swap fee on the taxable amount.
    fee = mul_up_fixed(taxable_amount, swap_fee_percentage)

    # // Create swap fees amount array and set the single fee we charge
    swap_fee_amounts = [0] * len(current_balances)
    swap_fee_amounts[token_out_index] = fee

    # // Return the net amount after subtracting the fee.
    amount_out_with_fee = amount_out - fee
    return {
        "amount_out_with_fee": amount_out_with_fee,
        "swap_fee_amounts": swap_fee_amounts,
    }


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
    current_balances,
    token_out_index,
    exact_amount_out,
    total_supply,
    swap_fee_percentage,
    compute_invariant,
):
    # // Determine the number of tokens in the pool.
    num_tokens = len(current_balances)

    # // Create a new array to hold the updated balances.
    new_balances = [0] * num_tokens

    # // Copy current_balances to new_balances
    for index in range(len(current_balances)):
        new_balances[index] = current_balances[index]

    # // Update the balance of token_out_index with exact_amount_out.
    new_balances[token_out_index] = new_balances[token_out_index] - exact_amount_out

    # // Calculate the invariant using the current balances.
    current_invariant = compute_invariant(current_balances)

    # // Calculate the new invariant ratio by dividing the new invariant by the current invariant.
    # // Calculate the taxable amount by subtracting the new balance from the equivalent proportional balance.
    taxable_amount = (
        mul_up_fixed(
            div_up_fixed(compute_invariant(new_balances), current_invariant),
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
    invariant_with_fees_applied = compute_invariant(new_balances)

    # // Create swap fees amount array and set the single fee we charge
    swap_fee_amounts = [0] * num_tokens
    swap_fee_amounts[token_out_index] = fee

    # // mulUp/divUp maximize the amount of tokens burned for the security reasons
    bpt_amount_in = div_up_fixed(
        mul_up_fixed(
            total_supply,
            current_invariant - invariant_with_fees_applied,
        ),
        current_invariant,
    )
    return {
        "bptAmountIn": bpt_amount_in,
        "swap_fee_amounts": swap_fee_amounts,
    }

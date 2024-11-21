import { MathSol } from '../utils/math';
import { Rounding } from './types';

export function computeAddLiquidityUnbalanced(
    currentBalances: bigint[],
    exactAmounts: bigint[],
    totalSupply: bigint,
    swapFeePercentage: bigint,
    computeInvariant: (balances: bigint[], rounding: Rounding) => bigint,
): { bptAmountOut: bigint; swapFeeAmounts: bigint[] } {
    /***********************************************************************
		//                                                                    //
		// s = totalSupply                                 (iFees - iCur)     //
		// b = tokenBalance                  bptOut = s *  --------------     //
		// bptOut = bptAmountOut                                iCur          //
		// iFees = invariantWithFeesApplied                                   //
		// iCur = currentInvariant                                            //
		// iNew = newInvariant                                                //
		***********************************************************************/

    // Determine the number of tokens in the pool.
    const numTokens = currentBalances.length;

    // Create a new array to hold the updated balances after the addition.
    const newBalances: bigint[] = new Array(numTokens);
    // Create a new array to hold the swap fee amount for each token.
    const swapFeeAmounts: bigint[] = new Array(numTokens).fill(0n);

    // Loop through each token, updating the balance with the added amount.
    for (let index = 0; index < currentBalances.length; index++) {
        newBalances[index] = currentBalances[index] + exactAmounts[index] - 1n;
    }

    // Calculate the invariant using the current balances (before the addition).
    const currentInvariant = computeInvariant(
        currentBalances,
        Rounding.ROUND_UP,
    );

    // Calculate the new invariant using the new balances (after the addition).
    const newInvariant = computeInvariant(newBalances, Rounding.ROUND_DOWN);

    // Calculate the new invariant ratio by dividing the new invariant by the old invariant.
    const invariantRatio = MathSol.divDownFixed(newInvariant, currentInvariant);

    // Loop through each token to apply fees if necessary.
    for (let index = 0; index < currentBalances.length; index++) {
        // Check if the new balance is greater than the equivalent proportional balance.
        // If so, calculate the taxable amount, rounding in favor of the protocol.
        // We round the second term down to subtract less and get a higher `taxableAmount`,
        // which charges higher swap fees. This will lower `newBalances`, which in turn lowers
        // `invariantWithFeesApplied` below.
        const proportionalTokenBalance = MathSol.mulDownFixed(
            invariantRatio,
            currentBalances[index],
        );
        if (newBalances[index] > proportionalTokenBalance) {
            const taxableAmount = newBalances[index] - proportionalTokenBalance;
            // Calculate fee amount
            swapFeeAmounts[index] = MathSol.mulUpFixed(
                taxableAmount,
                swapFeePercentage,
            );
            // Subtract the fee from the new balance.
            // We are essentially imposing swap fees on non-proportional incoming amounts.
            newBalances[index] = newBalances[index] - swapFeeAmounts[index];
        }
    }

    // Calculate the new invariant with fees applied.
    const invariantWithFeesApplied = computeInvariant(
        newBalances,
        Rounding.ROUND_DOWN,
    );

    // Calculate the amount of BPT to mint. This is done by multiplying the
    // total supply with the ratio of the change in invariant.
    // Since we multiply and divide we don't need to use FP math.
    // Round down since we're calculating BPT amount out. This is the most important result of this function,
    // equivalent to:
    // `totalSupply * (invariantWithFeesApplied / currentInvariant - 1)`

    // Then, to round `bptAmountOut` down we use `invariantWithFeesApplied` rounded down and `currentInvariant`
    // rounded up.
    // If rounding makes `invariantWithFeesApplied` smaller or equal to `currentInvariant`, this would effectively
    // be a donation. In that case we just let checked math revert for simplicity; it's not a valid use-case to
    // support at this point.
    const bptAmountOut =
        (totalSupply * (invariantWithFeesApplied - currentInvariant)) /
        currentInvariant;
    return { bptAmountOut, swapFeeAmounts };
}

export function computeAddLiquiditySingleTokenExactOut(
    currentBalances: bigint[],
    tokenInIndex: number,
    exactBptAmountOut: bigint,
    totalSupply: bigint,
    swapFeePercentage: bigint,
    computeBalance: (
        balancesLiveScaled18: bigint[],
        tokenInIndex: number,
        newSupply: bigint,
    ) => bigint,
): {
    amountInWithFee: bigint;
    swapFeeAmounts: bigint[];
} {
    // Calculate new supply after minting exactBptAmountOut
    const newSupply = exactBptAmountOut + totalSupply;
    // Calculate the initial amount of the input token needed for the desired amount of BPT out
    // "divUp" leads to a higher "newBalance," which in turn results in a larger "amountIn."
    // This leads to receiving more tokens for the same amount of BTP minted.
    const newBalance = computeBalance(
        currentBalances,
        tokenInIndex,
        MathSol.divUpFixed(newSupply, totalSupply),
    );
    const amountIn = newBalance - currentBalances[tokenInIndex];

    // Calculate the taxable amount, which is the difference
    // between the actual amount in and the non-taxable balance
    const nonTaxableBalance = MathSol.divDownFixed(
        MathSol.mulDownFixed(newSupply, currentBalances[tokenInIndex]),
        totalSupply,
    );

    const taxableAmount =
        amountIn + currentBalances[tokenInIndex] - nonTaxableBalance;

    // Calculate the swap fee based on the taxable amount and the swap fee percentage
    const fee =
        MathSol.divUpFixed(
            taxableAmount,
            MathSol.complementFixed(swapFeePercentage),
        ) - taxableAmount;

    // Create swap fees amount array and set the single fee we charge
    const swapFeeAmounts: bigint[] = new Array(currentBalances.length);
    swapFeeAmounts[tokenInIndex] = fee;

    // Return the total amount of input token needed, including the swap fee
    const amountInWithFee = amountIn + fee;
    return { amountInWithFee, swapFeeAmounts };
}

/**
 * @notice Computes the proportional amounts of tokens to be withdrawn from the pool.
 * @dev This function computes the amount of each token that will be withdrawn in exchange for burning
 * a specific amount of pool tokens (BPT). It ensures that the amounts of tokens withdrawn are proportional
 * to the current pool balances.
 *
 * Calculation: For each token, amountOut = balance * (bptAmountIn / bptTotalSupply).
 * Rounding down is used to prevent withdrawing more than the pool can afford.
 *
 * @param balances Array of current token balances in the pool.
 * @param bptTotalSupply Total supply of the pool tokens (BPT).
 * @param bptAmountIn The amount of pool tokens that will be burned.
 * @return amountsOut Array of amounts for each token to be withdrawn.
 */
export function computeProportionalAmountsOut(
    balances: bigint[],
    bptTotalSupply: bigint,
    bptAmountIn: bigint,
): bigint[] {
    /**********************************************************************************************
	// computeProportionalAmountsOut                                                             //
	// (per token)                                                                               //
	// aO = tokenAmountOut             /        bptIn         \                                  //
	// b = tokenBalance      a0 = b * | ---------------------  |                                 //
	// bptIn = bptAmountIn             \     bptTotalSupply    /                                 //
	// bpt = bptTotalSupply                                                                      //
	**********************************************************************************************/

    // Create a new array to hold the amounts of each token to be withdrawn.
    const amountsOut: bigint[] = [];
    for (let i = 0; i < balances.length; ++i) {
        // Since we multiply and divide we don't need to use FP math.
        // Round down since we're calculating amounts out.
        amountsOut.push((balances[i] * bptAmountIn) / bptTotalSupply);
    }
    return amountsOut;
}

/**
 * @notice Computes the amount of a single token to withdraw for a given amount of BPT to burn.
 * @dev It computes the output token amount for an exact input of BPT, considering current balances,
 * total supply, and swap fees.
 *
 * @param currentBalances The current token balances in the pool.
 * @param tokenOutIndex The index of the token to be withdrawn.
 * @param exactBptAmountIn The exact amount of BPT the user wants to burn.
 * @param totalSupply The total supply of BPT in the pool.
 * @param swapFeePercentage The swap fee percentage applied to the taxable amount.
 * @param computeBalance A function pointer to the balance calculation function.
 * @return amountOutWithFee The amount of the output token the user receives, accounting for swap fees.
 */
export function computeRemoveLiquiditySingleTokenExactIn(
    currentBalances: bigint[],
    tokenOutIndex: number,
    exactBptAmountIn: bigint,
    totalSupply: bigint,
    swapFeePercentage: bigint,
    computeBalance: (
        balancesLiveScaled18: bigint[],
        tokenInIndex: number,
        newSupply: bigint,
    ) => bigint,
): { amountOutWithFee: bigint; swapFeeAmounts: bigint[] } {
    // Calculate new supply accounting for burning exactBptAmountIn
    const newSupply = totalSupply - exactBptAmountIn;
    // Calculate the new balance of the output token after the BPT burn.
    // "divUp" leads to a higher "newBalance," which in turn results in a lower "amountOut."
    // This leads to giving less tokens for the same amount of BTP burned.
    const newBalance = computeBalance(
        currentBalances,
        tokenOutIndex,
        MathSol.divUpFixed(newSupply, totalSupply),
    );

    // Compute the amount to be withdrawn from the pool.
    const amountOut = currentBalances[tokenOutIndex] - newBalance;

    const newBalanceBeforeTax = MathSol.mulDivUpFixed(
        newSupply,
        currentBalances[tokenOutIndex],
        totalSupply,
    );

    // Compute the taxable amount: the difference between the new proportional and disproportional balances.
    const taxableAmount = newBalanceBeforeTax - newBalance;

    // Calculate the swap fee on the taxable amount.
    const fee = MathSol.mulUpFixed(taxableAmount, swapFeePercentage);

    // Create swap fees amount array and set the single fee we charge.
    const swapFeeAmounts = new Array(currentBalances.length);
    swapFeeAmounts[tokenOutIndex] = fee;

    // Return the net amount after subtracting the fee.
    const amountOutWithFee = amountOut - fee;

    return {
        amountOutWithFee,
        swapFeeAmounts,
    };
}

/**
 * @notice Computes the amount of pool tokens to burn to receive exact amount out.
 * @param currentBalances Current pool balances, in token registration order
 * @param tokenOutIndex Index of the token to receive in exchange for pool tokens burned
 * @param exactAmountOut Exact amount of tokens to receive
 * @param totalSupply Current total supply of the pool tokens (BPT)
 * @param swapFeePercentage The swap fee percentage applied to the taxable amount
 * @return bptAmountIn Amount of pool tokens to burn
 * @return swapFeeAmounts The amount of swap fees charged for each token
 */
export function computeRemoveLiquiditySingleTokenExactOut(
    currentBalances: bigint[],
    tokenOutIndex: number,
    exactAmountOut: bigint,
    totalSupply: bigint,
    swapFeePercentage: bigint,
    computeInvariant: (balances: bigint[], rounding: Rounding) => bigint,
): {
    bptAmountIn: bigint;
    swapFeeAmounts: bigint[];
} {
    // Determine the number of tokens in the pool.
    const numTokens = currentBalances.length;

    // Create a new array to hold the updated balances.
    const newBalances = new Array(numTokens);

    // Copy currentBalances to newBalances
    for (let index = 0; index < currentBalances.length; index++) {
        newBalances[index] = currentBalances[index] - 1n;
    }
    // Update the balance of tokenOutIndex with exactAmountOut.
    newBalances[tokenOutIndex] = newBalances[tokenOutIndex] - exactAmountOut;

    // Calculate the invariant using the current balances.
    const currentInvariant = computeInvariant(
        currentBalances,
        Rounding.ROUND_UP,
    );

    // We round invariant ratio up (see reason below).
    // This invariant ratio could be rounded up even more by rounding `currentInvariant` down. But since it only
    // affects the taxable amount and the fee calculation, whereas `currentInvariant` affects BPT in more directly,
    // we use `currentInvariant` rounded up here as well.
    const invariantRatio = MathSol.divUpFixed(
        computeInvariant(newBalances, Rounding.ROUND_UP),
        currentInvariant,
    );

    // Taxable amount is proportional to invariant ratio; a larger taxable amount rounds in the Vault's favor.
    const taxableAmount =
        MathSol.mulUpFixed(invariantRatio, currentBalances[tokenOutIndex]) -
        newBalances[tokenOutIndex];

    const fee =
        MathSol.divUpFixed(
            taxableAmount,
            MathSol.complementFixed(swapFeePercentage),
        ) - taxableAmount;

    // Update new balances array with a fee
    newBalances[tokenOutIndex] = newBalances[tokenOutIndex] - fee;

    // Calculate the new invariant with fees applied.
    const invariantWithFeesApplied = computeInvariant(
        newBalances,
        Rounding.ROUND_DOWN,
    );

    // Create swap fees amount array and set the single fee we charge
    const swapFeeAmounts = new Array(numTokens);
    swapFeeAmounts[tokenOutIndex] = fee;
    // Calculate the amount of BPT to burn. This is done by multiplying the total supply by the ratio of the
    // invariant delta to the current invariant.
    //
    // Calculating BPT amount in, so we round up. This is the most important result of this function, equivalent to:
    // `totalSupply * (1 - invariantWithFeesApplied / currentInvariant)`.
    // Then, to round `bptAmountIn` up we use `invariantWithFeesApplied` rounded down and `currentInvariant`
    // rounded up.
    //
    // Since `currentInvariant` is rounded up and `invariantWithFeesApplied` is rounded down, the difference
    // should always be positive. The checked math will revert if that is not the case.
    const bptAmountIn = MathSol.mulDivUpFixed(
        totalSupply,
        currentInvariant - invariantWithFeesApplied,
        currentInvariant,
    );

    return {
        bptAmountIn,
        swapFeeAmounts,
    };
}

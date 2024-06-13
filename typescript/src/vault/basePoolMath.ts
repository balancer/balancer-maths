import { MathSol } from "../utils/math";

export function computeAddLiquidityUnbalanced(
	currentBalances: bigint[],
	exactAmounts: bigint[],
	totalSupply: bigint,
	swapFeePercentage: bigint,
	computeInvariant: (balances: bigint[]) => bigint,
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
	const swapFeeAmounts: bigint[] = new Array(numTokens);

	// Loop through each token, updating the balance with the added amount.
	for (let index = 0; index < currentBalances.length; index++) {
		newBalances[index] = currentBalances[index] + exactAmounts[index];
	}

	// Calculate the invariant using the current balances (before the addition).
	const currentInvariant = computeInvariant(currentBalances);

	// Calculate the new invariant using the new balances (after the addition).
	const newInvariant = computeInvariant(newBalances);

	// Calculate the new invariant ratio by dividing the new invariant by the old invariant.
	const invariantRatio = MathSol.divDownFixed(newInvariant, currentInvariant);

	// Loop through each token to apply fees if necessary.
	for (let index = 0; index < currentBalances.length; index++) {
		// Check if the new balance is greater than the proportional balance.
		// If so, calculate the taxable amount.
		if (
			newBalances[index] >
			MathSol.mulUpFixed(invariantRatio, currentBalances[index])
		) {
			const taxableAmount =
				newBalances[index] -
				MathSol.mulUpFixed(invariantRatio, currentBalances[index]);
			// Calculate fee amount
			const swapFeeAmount = MathSol.mulUpFixed(
				taxableAmount,
				swapFeePercentage,
			);
			// Subtract the fee from the new balance.
			// We are essentially imposing swap fees on non-proportional incoming amounts.
			newBalances[index] = newBalances[index] - swapFeeAmount;
		}
	}

	// Calculate the new invariant with fees applied.
	const invariantWithFeesApplied = computeInvariant(newBalances);

	// Calculate the amount of BPT to mint. This is done by multiplying the
	// total supply with the ratio of the change in invariant.
	const bptAmountOut = MathSol.mulDownFixed(
		totalSupply,
		MathSol.divDownFixed(
			invariantWithFeesApplied - currentInvariant,
			currentInvariant,
		),
	);
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
		MathSol.divUpFixed(newSupply, totalSupply)
	);
	const amountIn = newBalance - currentBalances[tokenInIndex];

	// Calculate the taxable amount, which is the difference
	// between the actual amount in and the non-taxable balance
	const nonTaxableBalance = MathSol.divDownFixed(MathSol.mulUpFixed(newSupply, currentBalances[tokenInIndex]), totalSupply);

	const taxableAmount = amountIn + currentBalances[tokenInIndex] - nonTaxableBalance;

	// Calculate the swap fee based on the taxable amount and the swap fee percentage
	const fee = MathSol.divUpFixed(taxableAmount, MathSol.complementFixed(swapFeePercentage)) - taxableAmount;

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
	bptAmountIn: bigint
): bigint[] {
	/**********************************************************************************************
	// computeProportionalAmountsOut                                                             //
	// (per token)                                                                               //
	// aO = tokenAmountOut             /        bptIn         \                                  //
	// b = tokenBalance      a0 = b * | ---------------------  |                                 //
	// bptIn = bptAmountIn             \     bptTotalSupply    /                                 //
	// bpt = bptTotalSupply                                                                      //
	**********************************************************************************************/

	// Since we're computing an amount out, we round down overall. This means rounding down on both the
	// multiplication and division.

	const bptRatio = MathSol.divDownFixed(bptAmountIn, bptTotalSupply);

	const amountsOut: bigint[] = [];
	for (let i = 0; i < balances.length; i++) {
		amountsOut.push(MathSol.mulDownFixed(balances[i], bptRatio));
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
): { amountOutWithFee: bigint, swapFeeAmounts: bigint[] } {
	// Calculate new supply accounting for burning exactBptAmountIn
	const newSupply = totalSupply - exactBptAmountIn;
	// Calculate the new balance of the output token after the BPT burn.
	// "divUp" leads to a higher "newBalance," which in turn results in a lower "amountOut."
	// This leads to giving less tokens for the same amount of BTP burned.
	const newBalance = computeBalance(currentBalances, tokenOutIndex, MathSol.divUpFixed(newSupply, totalSupply));

	// Compute the amount to be withdrawn from the pool.
	const amountOut = currentBalances[tokenOutIndex] - newBalance;

	// Calculate the non-taxable balance proportionate to the BPT burnt.
	const nonTaxableBalance = MathSol.divDownFixed(MathSol.mulUpFixed(newSupply, currentBalances[tokenOutIndex]), totalSupply);

	// Compute the taxable amount: the difference between the non-taxable balance and actual withdrawal.
	const taxableAmount = nonTaxableBalance - newBalance;

	// Calculate the swap fee on the taxable amount.
	const fee = MathSol.mulUpFixed(taxableAmount, swapFeePercentage);

	// Create swap fees amount array and set the single fee we charge
	const swapFeeAmounts = new Array(currentBalances.length);
	swapFeeAmounts[tokenOutIndex] = fee;

	// Return the net amount after subtracting the fee.
	const amountOutWithFee = amountOut - fee;
	return {
		amountOutWithFee,
		swapFeeAmounts
	}
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
	computeInvariant: (balances: bigint[]) => bigint,
): {
	bptAmountIn: bigint,
	swapFeeAmounts: bigint[]
} {
	// Determine the number of tokens in the pool.
	const numTokens = currentBalances.length;

	// Create a new array to hold the updated balances.
	const newBalances = new Array(numTokens);

	// Copy currentBalances to newBalances
	for (let index = 0; index < currentBalances.length; index++) {
		newBalances[index] = currentBalances[index];
	}
	// Update the balance of tokenOutIndex with exactAmountOut.
	newBalances[tokenOutIndex] = newBalances[tokenOutIndex] - exactAmountOut;

	// Calculate the invariant using the current balances.
	const currentInvariant = computeInvariant(currentBalances);

	// Calculate the new invariant ratio by dividing the new invariant by the current invariant.
	// Calculate the taxable amount by subtracting the new balance from the equivalent proportional balance.
	const taxableAmount = MathSol.mulUpFixed(MathSol.divUpFixed(computeInvariant(newBalances), currentInvariant), currentBalances[tokenOutIndex]) - newBalances[tokenOutIndex];

	const fee = MathSol.divUpFixed(taxableAmount, MathSol.complementFixed(swapFeePercentage)) - taxableAmount;

	// Update new balances array with a fee
	newBalances[tokenOutIndex] = newBalances[tokenOutIndex] - fee;

	// Calculate the new invariant with fees applied.
	const invariantWithFeesApplied = computeInvariant(newBalances);

	// Create swap fees amount array and set the single fee we charge
	const swapFeeAmounts = new Array(numTokens);
	swapFeeAmounts[tokenOutIndex] = fee;

	// mulUp/divUp maximize the amount of tokens burned for the security reasons
	const bptAmountIn = MathSol.divUpFixed(MathSol.mulUpFixed(totalSupply, currentInvariant - invariantWithFeesApplied), currentInvariant);
	return {
		bptAmountIn,
		swapFeeAmounts
	}
}

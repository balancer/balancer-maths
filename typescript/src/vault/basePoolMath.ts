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

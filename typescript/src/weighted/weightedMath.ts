import { MathSol, WAD } from "../utils/math";

// A minimum normalized weight imposes a maximum weight ratio. We need this due to limitations in the
// implementation of the power function, as these ratios are often exponents.
export const _MIN_WEIGHT = BigInt(0.01e18);

// Pool limits that arise from limitations in the fixed point power function (and the imposed 1:100 maximum weight
// ratio).

// Swap limits: amounts swapped may not be larger than this percentage of the total balance.
export const _MAX_IN_RATIO = BigInt(0.3e18);
export const _MAX_OUT_RATIO = BigInt(0.3e18);

// Invariant growth limit: non-proportional joins cannot cause the invariant to increase by more than this ratio.
export const _MAX_INVARIANT_RATIO = BigInt(3e18);
// Invariant shrink limit: non-proportional exits cannot cause the invariant to decrease by less than this ratio.
export const _MIN_INVARIANT_RATIO = BigInt(0.7e18);

// About swap fees on joins and exits:
// Any join or exit that is not perfectly balanced (e.g. all single token joins or exits) is mathematically
// equivalent to a perfectly balanced join or exit followed by a series of swaps. Since these swaps would charge
// swap fees, it follows that (some) joins and exits should as well.
// On these operations, we split the token amounts in 'taxable' and 'non-taxable' portions, where the 'taxable' part
// is the one to which swap fees are applied.

// Invariant is used to collect protocol swap fees by comparing its value between two times.
// So we can round always to the same direction. It is also used to initiate the BPT amount
// and, because there is a minimum BPT, we round down the invariant.
export const _computeInvariant = (
	normalizedWeights: bigint[],
	balances: bigint[],
): bigint => {
	/**********************************************************************************************
    // invariant               _____                                                             //
    // wi = weight index i      | |      wi                                                      //
    // bi = balance index i     | |  bi ^   = i                                                  //
    // i = invariant                                                                             //
    **********************************************************************************************/

	let invariant = WAD;
	for (let i = 0; i < normalizedWeights.length; ++i) {
		invariant = MathSol.mulDownFixed(
			invariant,
			MathSol.powDownFixed(balances[i], normalizedWeights[i]),
		);
	}
	if (invariant === 0n) {
		throw new Error("ZeroInvariant");
	}
	return invariant;
};

export const _computeBalanceOutGivenInvariant = (
	currentBalance: bigint,
	weight: bigint,
	invariantRatio: bigint,
): bigint => {
	/******************************************************************************************
    // calculateBalanceGivenInvariant                                                       //
    // o = balanceOut                                                                        //
    // b = balanceIn                      (1 / w)                                            //
    // w = weight              o = b * i ^                                                   //
    // i = invariantRatio                                                                    //
    ******************************************************************************************/

	// Rounds result up overall.

	// Calculate by how much the token balance has to increase to match the invariantRatio.
	const balanceRatio = MathSol.powUpFixed(
		invariantRatio,
		MathSol.divUpFixed(WAD, weight),
	);

	return MathSol.mulUpFixed(currentBalance, balanceRatio);
};

// Computes how many tokens can be taken out of a pool if `amountIn` are sent, given the
// current balances and weights.
export const _computeOutGivenExactIn = (
	balanceIn: bigint,
	weightIn: bigint,
	balanceOut: bigint,
	weightOut: bigint,
	amountIn: bigint,
): bigint => {
	/**********************************************************************************************
    // outGivenExactIn                                                                                //
    // aO = amountOut                                                                            //
    // bO = balanceOut                                                                           //
    // bI = balanceIn              /      /            bI             \    (wI / wO) \           //
    // aI = amountIn    aO = bO * |  1 - | --------------------------  | ^            |          //
    // wI = weightIn               \      \       ( bI + aI )         /              /           //
    // wO = weightOut                                                                            //
    **********************************************************************************************/

	if (amountIn > MathSol.mulDownFixed(balanceIn, _MAX_IN_RATIO)) {
		throw new Error("MaxInRatio exceeded");
	}

	const denominator = balanceIn + amountIn;
	const base = MathSol.divUpFixed(balanceIn, denominator);
	const exponent = MathSol.divDownFixed(weightIn, weightOut);
	const power = MathSol.powUpFixed(base, exponent);

	// Because of rounding up, power can be greater than one. Using complement prevents reverts.
	return MathSol.mulDownFixed(balanceOut, MathSol.complementFixed(power));
};

// Computes how many tokens must be sent to a pool in order to take `amountOut`, given the
// current balances and weights.
export const _computeInGivenExactOut = (
	balanceIn: bigint,
	weightIn: bigint,
	balanceOut: bigint,
	weightOut: bigint,
	amountOut: bigint,
): bigint => {
	/**********************************************************************************************
    // inGivenExactOut                                                                                //
    // aO = amountOut                                                                            //
    // bO = balanceOut                                                                           //
    // bI = balanceIn              /  /            bO             \    (wO / wI)      \          //
    // aI = amountIn    aI = bI * |  | --------------------------  | ^            - 1  |         //
    // wI = weightIn               \  \       ( bO - aO )         /                   /          //
    // wO = weightOut                                                                            //
    **********************************************************************************************/

	if (amountOut > MathSol.mulDownFixed(balanceOut, _MAX_OUT_RATIO)) {
		throw new Error("MaxOutRatio exceeded");
	}

	const base = MathSol.divUpFixed(balanceOut, balanceOut - amountOut);
	const exponent = MathSol.divUpFixed(weightOut, weightIn);
	const power = MathSol.powUpFixed(base, exponent);

	// Because the base is larger than one (and the power rounds up), the power should always be larger than one, so
	// the following subtraction should never revert.
	const ratio = power - WAD;

	return MathSol.mulUpFixed(balanceIn, ratio);
};

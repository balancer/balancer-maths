import { MathSol, WAD } from '../utils/math';

// A minimum normalized weight imposes a maximum weight ratio. We need this due to limitations in the
// implementation of the power function, as these ratios are often exponents.
export const _MIN_WEIGHT = BigInt(0.01e18);

// Pool limits that arise from limitations in the fixed point power function (and the imposed 1:100 maximum weight
// ratio).

// Swap limits: amounts swapped may not be larger than this percentage of the total balance.
export const _MAX_IN_RATIO = BigInt(0.3e18);
export const _MAX_OUT_RATIO = BigInt(0.3e18);

export const _computeSwapFeePercentageGivenExactIn = (
    balanceIn: bigint,
    weightIn: bigint,
    weightOut: bigint,
    amountIn: bigint,
): bigint => {
    
    return _getSwapFeePercentageGivenExactIn(
        balanceIn, 
        MathSol.divDownFixed(weightIn, weightOut),
        amountIn
    );

};


export const _computeSwapFeePercentageGivenExactOut = (
    weightIn: bigint,
    balanceOut: bigint,
    weightOut: bigint,
    amountOut: bigint,
): bigint => {
    return _getSwapFeePercentageGivenExactOut(
        balanceOut, 
        MathSol.divUpFixed(weightOut, weightIn),
        amountOut
    );
}



// Computes the swap fee percentage in `tokenIn` if `amountIn` are sent
export const _getSwapFeePercentageGivenExactIn = (
    balanceIn: bigint,
    exponent: bigint,
    grossAmountIn: bigint,    
): bigint => {
    /**********************************************************************************************
    // outGivenExactInWithFees                                                                   //
    // aO = amountOut                                                                            //
    // bO = balanceOut                                                                           //
    // bI = balanceIn              /      /            bI + aI        \    (wI / wO) \           //
    // aI = amountIn    aO = bO * |  1 - | --------------------------  | ^            |          //
    // wI = weightIn               \      \       ( bI + aI * 2 )     /              /           //
    // wO = weightOut                                                                            //
    **********************************************************************************************/
        
    // swapFee = outGivenExactIn(grossAmountIn) - outGivenExactInWithFees(grossAmountIn)

    if (grossAmountIn > MathSol.mulDownFixed(balanceIn, _MAX_IN_RATIO)) {
        throw new Error('MaxInRatio exceeded');
    }    

    const grossBaseWithFees = MathSol.divUpFixed(balanceIn + grossAmountIn, balanceIn + grossAmountIn * BigInt(2));
    const grossBaseWithoutFees = MathSol.divUpFixed(balanceIn, balanceIn + grossAmountIn);

    const grossPowerWithFees = MathSol.powUpFixed(grossBaseWithFees, exponent);
    const grossPowerWithoutFees = MathSol.powUpFixed(grossBaseWithoutFees, exponent);

    return MathSol.mulDivUpFixed(
        exponent,
        MathSol.mulDivUpFixed(
            balanceIn + grossAmountIn, 
            grossPowerWithFees - grossPowerWithoutFees, 
            grossPowerWithFees
        ), 
        grossAmountIn
    );

};

// Computes the swap fee percentage in `tokenIn` in order to take `amountOut`
export const _getSwapFeePercentageGivenExactOut = (
    balanceOut: bigint,
    exponent: bigint,
    grossAmountOut: bigint,
): bigint => {
    /**********************************************************************************************
    // inGivenExactOutWithFees                                                                   //
    // aO = amountOut                                                                            //
    // bO = balanceOut                                                                           //
    // bI = balanceIn              /  /        bO - aO            \    (wO / wI)      \          //
    // aI = amountIn    aI = bI * |  | --------------------------  | ^            - 1  |         //
    // wI = weightIn               \  \     ( bO - aO * 2)        /                   /          //
    // wO = weightOut                                                                            //
    **********************************************************************************************/

    // swapFee = inGivenExactOutWithFees(grossAmountIn) - inGivenExactOut(grossAmountIn)

    if (grossAmountOut > MathSol.mulDownFixed(balanceOut, _MAX_OUT_RATIO)) {
            throw new Error('MaxOutRatio exceeded');
    }
    
    const grossBaseWithFees = MathSol.divUpFixed(balanceOut - grossAmountOut, balanceOut - grossAmountOut * BigInt(2));
    const grossBaseWithoutFees = MathSol.divUpFixed(balanceOut, balanceOut - grossAmountOut);

    const grossPowerWithFees = MathSol.powUpFixed(grossBaseWithFees, exponent);
    const grossPowerWithoutFees = MathSol.powUpFixed(grossBaseWithoutFees, exponent);

    return MathSol.divUpFixed(
        grossPowerWithFees - grossPowerWithoutFees,
        grossPowerWithFees - WAD
    );

};
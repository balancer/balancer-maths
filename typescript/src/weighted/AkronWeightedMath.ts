import { MathSol, WAD } from '../utils/math';

// A minimum normalized weight imposes a maximum weight ratio. We need this due to limitations in the
// implementation of the power function, as these ratios are often exponents.
export const _MIN_WEIGHT = BigInt(0.01e18);

// Pool limits that arise from limitations in the fixed point power function (and the imposed 1:100 maximum weight
// ratio).

export const _computeSwapFeePercentageGivenExactIn = (
    balanceIn: bigint,
    exponent: bigint,
    amountIn: bigint,
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
        
    // swap fee is equal to outGivenExactIn(grossAmountIn) - outGivenExactInWithFees(grossAmountIn)
    const powerWithFees = MathSol.powUpFixed(MathSol.divUpFixed(balanceIn + amountIn, balanceIn + amountIn * BigInt(2)),exponent)
    const powerWithoutFees = MathSol.powUpFixed(MathSol.divUpFixed(balanceIn, balanceIn + amountIn), exponent)

    return MathSol.mulDivUpFixed(
        exponent,
        MathSol.mulDivUpFixed(balanceIn + amountIn, powerWithFees - powerWithoutFees, powerWithFees),
        amountIn
    )
};


export const _computeSwapFeePercentageGivenExactOut = (
    balanceOut: bigint,
    exponent: bigint,
    amountOut: bigint,
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

    // swap fee is equal to inGivenExactOutWithFees(grossAmountIn) - inGivenExactOut(grossAmountIn)

    const powerWithFees = MathSol.powUpFixed(MathSol.divUpFixed(balanceOut - amountOut, balanceOut - amountOut * BigInt(2)), exponent)
    const powerWithoutFees = MathSol.powUpFixed(MathSol.divUpFixed(balanceOut, balanceOut - amountOut), exponent)
    
    return MathSol.divUpFixed(powerWithFees - powerWithoutFees, powerWithFees - WAD)
}



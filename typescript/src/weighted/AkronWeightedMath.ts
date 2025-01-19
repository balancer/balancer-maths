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
    lastBalanceIn: bigint,
    weightIn: bigint,
    balanceOut: bigint,
    lastBalanceOut: bigint,
    weightOut: bigint,
    amountIn: bigint,
): bigint => {
    // Compute normalized balances
    const lastNumerator = BigInt(lastBalanceIn * weightOut);
    const lastDenominator = BigInt(lastBalanceOut * weightIn);
    const lastPx = MathSol.divDownFixed(lastNumerator, lastDenominator);
    const numerator = BigInt(balanceIn * weightOut);
    const denominator = BigInt(balanceOut * weightIn);
    const px = MathSol.divDownFixed(numerator, denominator);
    
    // Compute normalized balanceIn by adding theoretical fees.
    // For example, if USDC is the input token, the last [USDC, ETH] reserves are [10000000, 33333] 
    // and current reserves are [102950, 333], then the normalized balanceIn would be around 104000.
    balanceIn = MathSol.mulDownFixed(balanceOut, weightIn) * (
        MathSol.divDownFixed(
            MathSol.powDownFixed(px > lastPx ? px - lastPx : lastPx - px, WAD * BigInt(2)), lastPx * BigInt(4)
        ) + px
    ) / weightOut;
    
    const lastInvariant = MathSol.mulUpFixed(
        MathSol.powUpFixed(lastBalanceIn, weightIn), 
        MathSol.powUpFixed(lastBalanceOut, weightOut)
    );
    const invariant = MathSol.mulUpFixed(
        MathSol.powUpFixed(balanceIn, weightIn), 
        MathSol.powUpFixed(balanceOut, weightOut)
    );
    // Compute normalized lastBalances
    if (lastInvariant != invariant) {
        lastBalanceIn = MathSol.mulDivUpFixed(lastBalanceIn, invariant, lastInvariant);
        lastBalanceOut = lastBalanceOut * invariant / lastInvariant;
    }

    // Compute swap fee percentage
    // The starting price is NOT the last price. Instead, it is derived from lastBalances, 
    // stored before the first swap of the block. For example, if the last trader, who happens to be
    // the first trader of the block, pushed the price of USDC/ETH from 3000 to 3050, 
    // and the current trader pushes the price from 3050 to 3200 in the same block, 
    // thus the current trader's swap fee would be the swap fee calculated from 3000 to 3200,
    // minus the swap fee calculated calculated from from 3000 to 3050.
    
    if (balanceIn > lastBalanceIn) {
        return _getSwapFeePercentageGivenExactIn(
            lastBalanceIn, 
            MathSol.divDownFixed(weightIn, weightOut),
            balanceIn - lastBalanceIn,
            balanceIn - lastBalanceIn + amountIn
        );
    } else {
        return _getSwapFeePercentageGivenExactIn(
            lastBalanceIn, 
            MathSol.divDownFixed(weightIn,weightOut),
            BigInt(0), 
            amountIn
        );
    }
};


export const _computeSwapFeePercentageGivenExactOut = (
    balanceIn: bigint,
    lastBalanceIn: bigint,
    weightIn: bigint,
    balanceOut: bigint,
    lastBalanceOut: bigint,
    weightOut: bigint,
    amountOut: bigint,
): bigint => {
    // Compute normalized balances
    const lastNumerator = BigInt(lastBalanceIn * weightOut);
    const lastDenominator = BigInt(lastBalanceOut * weightIn);
    const lastPx = MathSol.divDownFixed(lastNumerator, lastDenominator);
    const numerator = BigInt(balanceIn * weightOut);
    const denominator = BigInt(balanceOut * weightIn);
    const px = MathSol.divDownFixed(numerator, denominator);
    
    // Compute normalized balanceIn by adding theoretical fees.
    // For example, if USDC is the input token, the last [USDC, ETH] reserves are [10000000, 33333] 
    // and current reserves are [102950, 333], then the normalized balanceIn would be around 104000.
    balanceIn = MathSol.mulDownFixed(balanceOut, weightIn) * (
        MathSol.divDownFixed(
            MathSol.powDownFixed(px > lastPx ? px - lastPx : lastPx - px, WAD * BigInt(2)), lastPx * BigInt(4)
        ) + px
    ) / weightOut;
    
    const lastInvariant = MathSol.mulUpFixed(
        MathSol.powUpFixed(lastBalanceIn, weightIn), 
        MathSol.powUpFixed(lastBalanceOut, weightOut)
    );
    const invariant = MathSol.mulUpFixed(
        MathSol.powUpFixed(balanceIn, weightIn), 
        MathSol.powUpFixed(balanceOut, weightOut)
    );
    // Compute normalized lastBalances
    if (lastInvariant != invariant) {
        lastBalanceIn = MathSol.mulDivUpFixed(lastBalanceIn, invariant, lastInvariant);
        lastBalanceOut = lastBalanceOut * invariant / lastInvariant;
    }

    // Compute swap fee percentage
    // The starting price is NOT the last price. Instead, it is derived from lastBalances, 
    // stored before the first swap of the block. For example, if the last trader, who happens to be
    // the first trader of the block, pushed the price of USDC/ETH from 3000 to 3050, 
    // and the current trader pushes the price from 3050 to 3200 in the same block, 
    // thus the current trader's swap fee would be the swap fee calculated from 3000 to 3200,
    // minus the swap fee calculated calculated from from 3000 to 3050.
    if (lastBalanceOut > balanceOut) {
        return _getSwapFeePercentageGivenExactOut(
            lastBalanceOut, 
            MathSol.divUpFixed(weightOut,weightIn),
            lastBalanceOut - balanceOut,
            lastBalanceOut - balanceOut + amountOut
        );
    } else {
        return _getSwapFeePercentageGivenExactOut(
            lastBalanceOut, 
            MathSol.divUpFixed(weightOut, weightIn), 
            BigInt(0), 
            amountOut
        );
    }
}



// Computes the swap fee percentage in `tokenIn` if `amountIn` are sent
export const _getSwapFeePercentageGivenExactIn = (
    balanceIn: bigint,
    exponent: bigint,
    lastAmountIn: bigint,
    grossAmountIn: bigint,    
): bigint => {
    /**********************************************************************************************
    // outGivenExactIn                                                                                //
    // aO = amountOut                                                                            //
    // bO = balanceOut                                                                           //
    // bI = balanceIn              /      /            bI + aI        \    (wI / wO) \           //
    // aI = amountIn    aO = bO * |  1 - | --------------------------  | ^            |          //
    // wI = weightIn               \      \       ( bI + aI * 2 )     /              /           //
    // wO = weightOut                                                                            //
    **********************************************************************************************/
        
    // grossSwapFee = inGivenExactOutWithFees(grossAmountIn) - inGivenExactOut(grossAmountIn)
    // lastSwapFee = inGivenExactOutWithFees(lastAmountIn) - inGivenExactOut(lastAmountIn)
    // netSwapFee = grossSwapFee - lastSwapFee

    if (grossAmountIn > MathSol.mulDownFixed(balanceIn, _MAX_IN_RATIO)) {
        throw new Error('MaxInRatio exceeded');
    }    

    const grossBaseWithFees = MathSol.divUpFixed(balanceIn + grossAmountIn, balanceIn + grossAmountIn * BigInt(2));
    const grossBaseWithoutFees = MathSol.divUpFixed(balanceIn, balanceIn + grossAmountIn);
    
    // const exponent = MathSol.divDownFixed(weightIn, weightOut);

    const grossPowerWithFees = MathSol.powUpFixed(grossBaseWithFees, exponent);
    const grossPowerWithoutFees = MathSol.powUpFixed(grossBaseWithoutFees, exponent);

    if (lastAmountIn !== BigInt(0)) {
        const lastBaseWithFees = MathSol.divUpFixed(balanceIn + lastAmountIn, balanceIn + lastAmountIn * BigInt(2));
        const lastBaseWithoutFees = MathSol.divUpFixed(balanceIn, balanceIn + lastAmountIn);        
        const lastPowerWithFees = MathSol.powUpFixed(lastBaseWithFees, exponent);
        const lastPowerWithoutFees = MathSol.powUpFixed(lastBaseWithoutFees, exponent);
        const grossFinalPower = MathSol.mulDivUpFixed(
            balanceIn + grossAmountIn, grossPowerWithFees - grossPowerWithoutFees, grossPowerWithFees
        ) 
        const lastFinalPower = MathSol.mulDivUpFixed(
            balanceIn + lastAmountIn, lastPowerWithFees - lastPowerWithoutFees, lastPowerWithFees
        );
        return MathSol.mulDivUpFixed(exponent, grossFinalPower - lastFinalPower, grossAmountIn - lastAmountIn);
    } else {
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
};

// Computes the swap fee percentage in `tokenIn` in order to take `amountOut`
export const _getSwapFeePercentageGivenExactOut = (
    balanceOut: bigint,
    exponent: bigint,
    lastAmountOut: bigint,
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

    if (grossAmountOut > MathSol.mulDownFixed(balanceOut, _MAX_OUT_RATIO)) {
            throw new Error('MaxOutRatio exceeded');
    }
    
    const grossBaseWithFees = MathSol.divUpFixed(balanceOut - grossAmountOut, balanceOut - grossAmountOut * BigInt(2));
    const grossBaseWithoutFees = MathSol.divUpFixed(balanceOut, balanceOut - grossAmountOut);

    const grossPowerWithFees = MathSol.powUpFixed(grossBaseWithFees, exponent);
    const grossPowerWithoutFees = MathSol.powUpFixed(grossBaseWithoutFees, exponent);

    if (lastAmountOut !== BigInt(0)) {
        const lastBaseWithFees = MathSol.divUpFixed(balanceOut - lastAmountOut, balanceOut - lastAmountOut * BigInt(2));
        const lastBaseWithoutFees = MathSol.divUpFixed(balanceOut, balanceOut - lastAmountOut);        
        const lastPowerWithFees = MathSol.powUpFixed(lastBaseWithFees, exponent);
        const lastPowerWithoutFees = MathSol.powUpFixed(lastBaseWithoutFees, exponent);
        return MathSol.divUpFixed(
            (grossPowerWithFees - grossPowerWithoutFees) - (lastPowerWithFees - lastPowerWithoutFees), 
            grossPowerWithoutFees - lastPowerWithoutFees
        );
    } else {
        return MathSol.divUpFixed(
            grossPowerWithFees - grossPowerWithoutFees,
            grossPowerWithFees - WAD
        );
    };
};
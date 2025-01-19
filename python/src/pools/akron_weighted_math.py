from src.maths import (
    mul_down_fixed,
    pow_down_fixed,
    div_up_fixed,
    div_down_fixed,
    pow_up_fixed,
    complement_fixed,
    mul_up_fixed,
    mul_div_up
)

WAD = int(1e18)

# Pool limits that arise from limitations in the fixed point power function (and the imposed 1:100 maximum weight
# ratio).

# Swap limits: amounts swapped may not be larger than this percentage of the total balance.
_MAX_IN_RATIO = int(0.3e18)
_MAX_OUT_RATIO = int(0.3e18)

def _computeSwapFeePercentageGivenExactIn(
    balanceIn: int,
    lastBalanceIn: int,
    weightIn: int,
    balanceOut: int,
    lastBalanceOut: int,
    weightOut: int,
    amountIn: int,
) -> int:
    # Compute normalized balances
    lastNumerator = lastBalanceIn * weightOut
    lastDenominator = lastBalanceOut * weightIn
    lastPx = div_down_fixed(lastNumerator, lastDenominator)
    numerator = balanceIn * weightOut
    denominator = balanceOut * weightIn
    px = div_down_fixed(numerator, denominator)
    
    # Compute normalized balanceIn by adding theoretical fees.
    # For example, if USDC is the input token, the last [USDC, ETH] reserves are [10000000, 33333] 
    # and current reserves are [102950, 333], then the normalized balanceIn would be around 104000.
    balanceIn = mul_down_fixed(balanceOut, weightIn) * (
        div_down_fixed(pow_down_fixed(px - lastPx, WAD * 2), lastPx * 4) + px
    ) / weightOut
    
    lastInvariant = mul_up_fixed(
        pow_up_fixed(lastBalanceIn, weightIn), 
        pow_up_fixed(lastBalanceOut, weightOut)
    )
    invariant = mul_up_fixed(
        pow_up_fixed(balanceIn, weightIn), 
        pow_up_fixed(balanceOut, weightOut)
    )
    # Compute normalized lastBalances
    if (lastInvariant != invariant):
        lastBalanceIn = mul_div_up(lastBalanceIn, invariant, lastInvariant)
        lastBalanceOut = lastBalanceOut * invariant / lastInvariant


    # Compute swap fee percentage
    # The starting price is NOT the last price. Instead, it is derived from lastBalances, 
    # stored before the first swap of the block. For example, if the last trader, who happens to be
    # the first trader of the block, pushed the price of USDC/ETH from 3000 to 3050, 
    # and the current trader pushes the price from 3050 to 3200 in the same block, 
    # thus the current trader's swap fee would be the swap fee calculated from 3000 to 3200,
    # minus the swap fee calculated calculated from from 3000 to 3050.
    
    if (balanceIn > lastBalanceIn):
        return _getSwapFeePercentageGivenExactIn(
            lastBalanceIn, 
            div_down_fixed(weightIn, weightOut),
            balanceIn - lastBalanceIn,
            balanceIn - lastBalanceIn + amountIn
        )
    else:
        return _getSwapFeePercentageGivenExactIn(
            lastBalanceIn, 
            div_down_fixed(weightIn,weightOut),
            (0), 
            amountIn
        )
    

def _computeSwapFeePercentageGivenExactOut  (
    balanceIn: int,
    lastBalanceIn: int,
    weightIn: int,
    balanceOut: int,
    lastBalanceOut: int,
    weightOut: int,
    amountOut: int,
) -> int:
    # Compute normalized balances
    lastNumerator = lastBalanceIn * weightOut
    lastDenominator = lastBalanceOut * weightIn
    lastPx = div_down_fixed(lastNumerator, lastDenominator)
    numerator = balanceIn * weightOut
    denominator = balanceOut * weightIn
    px = div_down_fixed(numerator, denominator)
    
    # Compute normalized balanceIn by adding theoretical fees.
    # For example, if USDC is the input token, the last [USDC, ETH] reserves are [10000000, 33333] 
    # and current reserves are [102950, 333], then the normalized balanceIn would be around 104000.
    balanceIn = mul_down_fixed(balanceOut, weightIn) * (
        div_down_fixed(pow_down_fixed(px - lastPx, WAD * 2), lastPx * 4) + px
    ) / weightOut
    
    lastInvariant = mul_up_fixed(
        pow_up_fixed(lastBalanceIn, weightIn), 
        pow_up_fixed(lastBalanceOut, weightOut)
    )
    invariant = mul_up_fixed(
        pow_up_fixed(balanceIn, weightIn), 
        pow_up_fixed(balanceOut, weightOut)
    )
    # Compute normalized lastBalances
    if (lastInvariant != invariant):
        lastBalanceIn = mul_div_up(lastBalanceIn, invariant, lastInvariant)
        lastBalanceOut = lastBalanceOut * invariant / lastInvariant

    # Compute swap fee percentage
    # The starting price is NOT the last price. Instead, it is derived from lastBalances, 
    # stored before the first swap of the block. For example, if the last trader, who happens to be
    # the first trader of the block, pushed the price of USDC/ETH from 3000 to 3050, 
    # and the current trader pushes the price from 3050 to 3200 in the same block, 
    # thus the current trader's swap fee would be the swap fee calculated from 3000 to 3200,
    # minus the swap fee calculated calculated from from 3000 to 3050.
    if  lastBalanceOut > balanceOut:
        return _getSwapFeePercentageGivenExactOut(
            lastBalanceOut, 
            div_up_fixed(weightOut,weightIn),
            lastBalanceOut - balanceOut,
            lastBalanceOut - balanceOut + amountOut
        )
    else:
        return _getSwapFeePercentageGivenExactOut(
            lastBalanceOut, 
            div_up_fixed(weightOut, weightIn), 
            (0), 
            amountOut
        )
 



# Computes the swap fee percentage in `tokenIn` if `amountIn` are sent
def _getSwapFeePercentageGivenExactIn  (
    balanceIn: int,
    exponent: int,
    lastAmountIn: int,
    grossAmountIn: int,    
) -> int:
    # **********************************************************************************************
    # outGivenExactIn                                                                           
    # aO = amountOut                                                                            
    # bO = balanceOut                                                                           
    # bI = balanceIn              /      /            bI + aI        \    (wI / wO) \           
    # aI = amountIn    aO = bO * |  1 - | --------------------------  | ^            |          
    # wI = weightIn               \      \       ( bI + aI * 2 )     /              /           
    # wO = weightOut                                                                            
    # **********************************************************************************************
        
    # grossSwapFee = inGivenExactOutWithFees(grossAmountIn) - inGivenExactOut(grossAmountIn)
    # lastSwapFee = inGivenExactOutWithFees(lastAmountIn) - inGivenExactOut(lastAmountIn)
    # netSwapFee = grossSwapFee - lastSwapFee

    if (grossAmountIn > mul_down_fixed(balanceIn, _MAX_IN_RATIO)):
        raise ValueError('MaxInRatio exceeded')

    grossBaseWithFees = div_up_fixed(balanceIn + grossAmountIn, balanceIn + grossAmountIn * 2)
    grossBaseWithoutFees = div_up_fixed(balanceIn, balanceIn + grossAmountIn)
    
    # exponent = div_down_fixed(weightIn, weightOut)

    grossPowerWithFees = pow_up_fixed(grossBaseWithFees, exponent)
    grossPowerWithoutFees = pow_up_fixed(grossBaseWithoutFees, exponent)

    if (lastAmountIn != 0):
        lastBaseWithFees = div_up_fixed(balanceIn + lastAmountIn, balanceIn + lastAmountIn * 2)
        lastBaseWithoutFees = div_up_fixed(balanceIn, balanceIn + lastAmountIn)        
        lastPowerWithFees = pow_up_fixed(lastBaseWithFees, exponent)
        lastPowerWithoutFees = pow_up_fixed(lastBaseWithoutFees, exponent)
        grossFinalPower = mul_div_up(
            balanceIn + grossAmountIn, grossPowerWithFees - grossPowerWithoutFees, grossPowerWithFees
        ) 
        lastFinalPower = mul_div_up(
            balanceIn + lastAmountIn, lastPowerWithFees - lastPowerWithoutFees, lastPowerWithFees
        )
        return mul_div_up(exponent, grossFinalPower - lastFinalPower, grossAmountIn - lastAmountIn)
    else:
        return mul_div_up(
            exponent,
            mul_div_up(
                balanceIn + grossAmountIn, 
                grossPowerWithFees - grossPowerWithoutFees, 
                grossPowerWithFees
            ), 
            grossAmountIn
        )

# Computes the swap fee percentage in `tokenIn` in order to take `amountOut`
def _getSwapFeePercentageGivenExactOut  (
    balanceOut: int,
    exponent: int,
    lastAmountOut: int,
    grossAmountOut: int,
) -> int:
    # **********************************************************************************************
    # inGivenExactOutWithFees                                                                   
    # aO = amountOut                                                                            
    # bO = balanceOut                                                                           
    # bI = balanceIn              /  /        bO - aO            \    (wO / wI)      \          
    # aI = amountIn    aI = bI * |  | --------------------------  | ^            - 1  |         
    # wI = weightIn               \  \     ( bO - aO * 2)        /                   /          
    # wO = weightOut                                                                            
    # **********************************************************************************************

    if (grossAmountOut > mul_down_fixed(balanceOut, _MAX_OUT_RATIO)):
            raise ValueError('MaxOutRatio exceeded')
    
    grossBaseWithFees = div_up_fixed(balanceOut - grossAmountOut, balanceOut - grossAmountOut * 2)
    grossBaseWithoutFees = div_up_fixed(balanceOut, balanceOut - grossAmountOut)

    grossPowerWithFees = pow_up_fixed(grossBaseWithFees, exponent)
    grossPowerWithoutFees = pow_up_fixed(grossBaseWithoutFees, exponent)

    if (lastAmountOut != 0):
        lastBaseWithFees = div_up_fixed(balanceOut - lastAmountOut, balanceOut - lastAmountOut * 2)
        lastBaseWithoutFees = div_up_fixed(balanceOut, balanceOut - lastAmountOut)        
        lastPowerWithFees = pow_up_fixed(lastBaseWithFees, exponent)
        lastPowerWithoutFees = pow_up_fixed(lastBaseWithoutFees, exponent)
        return div_up_fixed(
            (grossPowerWithFees - grossPowerWithoutFees) - (lastPowerWithFees - lastPowerWithoutFees), 
            grossPowerWithoutFees - lastPowerWithoutFees
        )
    else:
        return div_up_fixed(
            grossPowerWithFees - grossPowerWithoutFees,
            grossPowerWithFees - WAD
        )


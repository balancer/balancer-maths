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

def _computeSwapFeePercentageGivenExactIn(
    balanceIn: int,
    exponent: int,
    amountIn: int
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
    
    powerWithFees = pow_up_fixed(div_up_fixed(balanceIn + amountIn, balanceIn + amountIn * 2),exponent)
    powerWithoutFees = pow_up_fixed(div_up_fixed(balanceIn, balanceIn + amountIn), exponent)
    return mul_div_up(
        exponent,
        mul_div_up(balanceIn + amountIn, powerWithFees - powerWithoutFees, powerWithFees),
        amountIn
    )

def _computeSwapFeePercentageGivenExactOut(
    balanceOut: int,
    exponent: int,
    amountOut: int
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
    
    powerWithFees = pow_up_fixed(div_up_fixed(balanceOut - amountOut, balanceOut - amountOut * 2), exponent)
    powerWithoutFees = pow_up_fixed(div_up_fixed(balanceOut, balanceOut - amountOut), exponent)
    
    return div_up_fixed(powerWithFees - powerWithoutFees, powerWithFees - WAD)
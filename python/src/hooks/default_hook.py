class Default_Hook:
    shouldCallComputeDynamicSwapFee: False
    shouldCallBeforeSwap: False
    shouldCallAfterSwap: False
    shouldCallBeforeAddLiquidity: False
    shouldCallAfterAddLiquidity: False
    shouldCallBeforeRemoveLiquidity: False
    shouldCallAfterRemoveLiquidity: False
    enableHookAdjustedAmounts: False
    def onBeforeAddLiquidity():
        return False
    def onAfterAddLiquidity():
        return { "success": False, "hookAdjustedAmountsInRaw": [] }
    
    def onBeforeRemoveLiquidity():
        return { "success": False, "hookAdjustedAmountsInRaw": [] };
    
    def onAfterRemoveLiquidity():
        return { "success": False, "hookAdjustedAmountsOutRaw": [] }
    
    def onBeforeSwap():
        return { "success": False, "hookAdjustedBalancesScaled18": [] }
    
    def onAfterSwap():
        return { "success": False, "hookAdjustedAmountCalculatedRaw": 0 }
    
    def onComputeDynamicSwapFee():
        return { "success": False, "dynamicSwapFee": 0 }
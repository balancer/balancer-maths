class DefaultHook:
    shouldCallComputeDynamicSwapFee: False
    shouldCallBeforeSwap: False
    shouldCallAfterSwap: False
    shouldCallBeforeAddLiquidity: False
    shouldCallAfterAddLiquidity: False
    shouldCallBeforeRemoveLiquidity: False
    shouldCallAfterRemoveLiquidity: False
    enableHookAdjustedAmounts: False

    def on_before_add_liquidity(self):
        return False

    def on_after_add_liquidity(self):
        return {"success": False, "hookAdjustedAmountsInRaw": []}

    def on_before_remove_liquidity(self):
        return {"success": False, "hookAdjustedAmountsInRaw": []}

    def on_after_remove_liquidity(self):
        return {"success": False, "hookAdjustedAmountsOutRaw": []}

    def on_before_swap(self):
        return {"success": False, "hookAdjustedBalancesScaled18": []}

    def on_after_swap(self):
        return {"success": False, "hookAdjustedAmountCalculatedRaw": 0}

    def on_compute_dynamic_swap_fee(self):
        return {"success": False, "dynamicSwapFee": 0}

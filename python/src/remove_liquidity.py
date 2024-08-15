def remove_liquidity(
    remove_liquidity_input, pool_state, pool_class, hook_class, hook_state
):
    return {
        "bpt_amount_in_raw": remove_liquidity_input["max_bpt_amount_in_raw"],
        "amounts_out_raw": remove_liquidity_input["min_amounts_out_raw"],
    }

def add_liquidity(add_liquidity_input, pool_class, hook_class, hook_state):
    return {
        "bpt_amount_out_raw": add_liquidity_input["min_bpt_amount_out_raw"],
        "amounts_in_raw": add_liquidity_input["max_amounts_in_raw"],
    }

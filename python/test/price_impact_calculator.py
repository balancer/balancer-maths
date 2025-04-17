from src.pools.stable_math import compute_invariant, compute_out_given_exact_in

DECIMALS = 10**18

def simulate_custom_slippage(
    amp: int,
    total_tvl_usd: float,
    composition_pct: list[float],
    swap_amount_usd: float,
    token_index_in: int = 0,
    token_index_out: int = 1,
    fee_decimal: float = 0.0001
):
    total_pct = sum(composition_pct)
    normalized_weights = [p / total_pct for p in composition_pct]

    balances = [int(total_tvl_usd * w * DECIMALS) for w in normalized_weights]

    amount_in = int(swap_amount_usd)

    invariant = compute_invariant(amp, balances.copy())

    amount_out = compute_out_given_exact_in(
        amplification_parameter=amp,
        balances=balances.copy(),
        token_index_in=token_index_in,
        token_index_out=token_index_out,
        token_amount_in=amount_in,
        invariant=invariant,
    )

    amount_out_after_fee = amount_out * (DECIMALS - int(fee_decimal * DECIMALS)) / DECIMALS

    slippage_bps = (amount_out_after_fee / amount_in - 1) * 10_000

    return {
        "AMP": amp,
        "TVL (USD)": total_tvl_usd,
        "Swap Amount (USD)": swap_amount_usd,
        "From Token Index": token_index_in,
        "To Token Index": token_index_out,
        "Out Amount (USD)": amount_out_after_fee,
        "Price Impact (bps)": slippage_bps,
        "Balances (USD)": [round(b / DECIMALS, 2) for b in balances],
        "Composition (%)": [round(w * 100, 2) for w in normalized_weights],
        "Pool Size": len(composition_pct),
    }

if __name__ == "__main__":
    result = simulate_custom_slippage(
        amp=8000,
        total_tvl_usd=40_000_000,
        composition_pct=[50, 50],
        swap_amount_usd=10_000_000,
        token_index_in=0,
        token_index_out=1,
        fee_decimal=0.0001,
    )
    print(result)

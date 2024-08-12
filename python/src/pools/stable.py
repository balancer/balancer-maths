from src.pools.stable_math import (
    compute_invariant,
    compute_out_given_exact_in,
    compute_in_given_exact_out,
)
from src.swap import SwapKind


class Stable:
    def __init__(self, pool_state):
        self.amp = pool_state["amp"]

    def on_swap(self, swap_params):
        invariant = compute_invariant(self.amp, swap_params["balances_live_scaled18"])

        if swap_params["swap_kind"] == SwapKind.GIVENIN.value:
            return compute_out_given_exact_in(
                self.amp,
                swap_params["balances_live_scaled18"],
                swap_params["index_in"],
                swap_params["index_out"],
                swap_params["amount_given_scaled18"],
                invariant,
            )
        return compute_in_given_exact_out(
            self.amp,
            swap_params["balances_live_scaled18"],
            swap_params["index_in"],
            swap_params["index_out"],
            swap_params["amount_given_scaled18"],
            invariant,
        )

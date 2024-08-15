from src.pools.weighted_math import (
    compute_out_given_exact_in,
    compute_in_given_exact_out,
    compute_invariant,
    compute_balance_out_given_invariant,
)
from src.swap import SwapKind


class Weighted:
    def __init__(self, pool_state):
        self.normalized_weights = pool_state["weights"]

    def on_swap(self, swap_params):
        if swap_params["swap_kind"] == SwapKind.GIVENIN.value:
            return compute_out_given_exact_in(
                swap_params["balances_live_scaled18"][swap_params["index_in"]],
                self.normalized_weights[swap_params["index_in"]],
                swap_params["balances_live_scaled18"][swap_params["index_out"]],
                self.normalized_weights[swap_params["index_out"]],
                swap_params["amount_given_scaled18"],
            )

        return compute_in_given_exact_out(
            swap_params["balances_live_scaled18"][swap_params["index_in"]],
            self.normalized_weights[swap_params["index_in"]],
            swap_params["balances_live_scaled18"][swap_params["index_out"]],
            self.normalized_weights[swap_params["index_out"]],
            swap_params["amount_given_scaled18"],
        )

    def compute_invariant(self, balances_live_scaled18):
        return compute_invariant(self.normalized_weights, balances_live_scaled18)

    def compute_balance(
        self,
        balances_live_scaled18,
        token_in_index,
        invariant_ratio,
    ):
        return compute_balance_out_given_invariant(
            balances_live_scaled18[token_in_index],
            self.normalized_weights[token_in_index],
            invariant_ratio,
        )

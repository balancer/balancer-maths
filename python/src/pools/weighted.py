from src.maths import Rounding
from src.pools.weighted_math import (
    compute_out_given_exact_in,
    compute_in_given_exact_out,
    compute_invariant_up,
    compute_invariant_down,
    compute_balance_out_given_invariant,
    _MAX_INVARIANT_RATIO,
    _MIN_INVARIANT_RATIO,
)
from src.swap import SwapKind, SwapParams


class Weighted:
    def __init__(self, pool_state):
        self.normalized_weights = pool_state["weights"]

    def get_maximum_invariant_ratio(self) -> int:
        return _MAX_INVARIANT_RATIO

    def get_minimum_invariant_ratio(self) -> int:
        return _MIN_INVARIANT_RATIO

    def on_swap(self, swap_params: SwapParams) -> int:
        if swap_params.swap_kind == SwapKind.GIVENIN.value:
            return compute_out_given_exact_in(
                swap_params.balances_live_scaled18[swap_params.index_in],
                self.normalized_weights[swap_params.index_in],
                swap_params.balances_live_scaled18[swap_params.index_out],
                self.normalized_weights[swap_params.index_out],
                swap_params.amount_given_scaled18,
            )

        return compute_in_given_exact_out(
            swap_params.balances_live_scaled18[swap_params.index_in],
            self.normalized_weights[swap_params.index_in],
            swap_params.balances_live_scaled18[swap_params.index_out],
            self.normalized_weights[swap_params.index_out],
            swap_params.amount_given_scaled18,
        )

    def compute_invariant(self, balances_live_scaled18, rounding):
        if rounding == Rounding.ROUND_UP:
            return compute_invariant_up(self.normalized_weights, balances_live_scaled18)
        else:
            return compute_invariant_down(
                self.normalized_weights, balances_live_scaled18
            )

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

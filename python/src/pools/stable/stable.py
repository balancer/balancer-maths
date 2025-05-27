from src.maths import mul_down_fixed, Rounding
from src.pools.stable.stable_math import (
    compute_invariant,
    compute_out_given_exact_in,
    compute_in_given_exact_out,
    compute_balance,
    _MAX_INVARIANT_RATIO,
    _MIN_INVARIANT_RATIO,
)
from src.common.types import SwapKind, SwapParams, SwapInput


class Stable:
    def __init__(self, pool_state):
        self.amp = pool_state["amp"]

    def get_maximum_invariant_ratio(self) -> int:
        return _MAX_INVARIANT_RATIO

    def get_minimum_invariant_ratio(self) -> int:
        return _MIN_INVARIANT_RATIO

    def on_swap(self, swap_params: SwapParams) -> int:
        invariant = compute_invariant(self.amp, swap_params.balances_live_scaled18)

        if swap_params.swap_kind == SwapKind.GIVENIN:
            return compute_out_given_exact_in(
                self.amp,
                swap_params.balances_live_scaled18,
                swap_params.index_in,
                swap_params.index_out,
                swap_params.amount_given_scaled18,
                invariant,
            )
        return compute_in_given_exact_out(
            self.amp,
            swap_params.balances_live_scaled18,
            swap_params.index_in,
            swap_params.index_out,
            swap_params.amount_given_scaled18,
            invariant,
        )

    def compute_invariant(self, balances_live_scaled18, rounding):
        invariant = compute_invariant(self.amp, balances_live_scaled18)
        if invariant > 0:
            invariant = invariant if rounding == Rounding.ROUND_DOWN else invariant + 1
        return invariant

    def compute_balance(
        self,
        balances_live_scaled18,
        token_in_index,
        invariant_ratio,
    ):
        return compute_balance(
            self.amp,
            balances_live_scaled18,
            mul_down_fixed(
                self.compute_invariant(balances_live_scaled18, Rounding.ROUND_UP),
                invariant_ratio,
            ),
            token_in_index,
        )

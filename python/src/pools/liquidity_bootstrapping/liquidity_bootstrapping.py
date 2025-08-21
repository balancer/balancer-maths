from src.common.swap_params import SwapParams
from src.pools.liquidity_bootstrapping.liquidity_bootstrapping_data import (
    LiquidityBootstrappingState,
)
from src.pools.liquidity_bootstrapping.liquidity_bootstrapping_math import (
    get_normalized_weights,
)
from src.pools.weighted.weighted import Weighted


class LiquidityBootstrapping(Weighted):
    def __init__(
        self, pool_state: LiquidityBootstrappingState
    ):  # pylint: disable=super-init-not-called
        project_token_start_weight = pool_state.start_weights[
            pool_state.project_token_index
        ]
        project_token_end_weight = pool_state.end_weights[
            pool_state.project_token_index
        ]
        current_time = pool_state.current_timestamp
        weights = get_normalized_weights(
            pool_state.project_token_index,
            current_time,
            pool_state.start_time,
            pool_state.end_time,
            project_token_start_weight,
            project_token_end_weight,
        )
        self.normalized_weights = weights
        self.lbp_state = pool_state

    def on_swap(self, swap_params: SwapParams) -> int:
        if not self.lbp_state.is_swap_enabled:
            raise ValueError("Swap is not enabled")
        if (
            self.lbp_state.is_project_token_swap_in_blocked
            and swap_params.index_in == self.lbp_state.project_token_index
        ):
            raise ValueError("Project token swap in is blocked")
        return super().on_swap(swap_params)

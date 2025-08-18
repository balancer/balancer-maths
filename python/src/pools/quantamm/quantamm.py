from typing import List

from src.common.maths import Rounding, mul_down_fixed
from src.common.pool_base import PoolBase
from src.common.swap_params import SwapParams
from src.common.types import SwapKind
from src.pools.quantamm.quantamm_data import QuantAmmState
from src.pools.quantamm.quantamm_math import (
    calculate_block_normalised_weight,
    get_first_four_weights_and_multipliers,
    get_second_four_weights_and_multipliers,
)
from src.pools.weighted.weighted_math import (
    _MAX_INVARIANT_RATIO,
    _MIN_INVARIANT_RATIO,
    compute_balance_out_given_invariant,
    compute_in_given_exact_out,
    compute_invariant_down,
    compute_invariant_up,
    compute_out_given_exact_in,
)


class QuantAmm(PoolBase):
    def __init__(self, pool_state: QuantAmmState):
        self.quant_amm_state = pool_state

        # Initialize weights and multipliers
        first = get_first_four_weights_and_multipliers(
            pool_state.tokens,
            pool_state.first_four_weights_and_multipliers,
        )
        second = get_second_four_weights_and_multipliers(
            pool_state.tokens,
            pool_state.second_four_weights_and_multipliers,
        )

        self.weights = first[0] + second[0]
        self.multipliers = first[1] + second[1]

    def get_maximum_invariant_ratio(self) -> int:
        return _MAX_INVARIANT_RATIO

    def get_minimum_invariant_ratio(self) -> int:
        return _MIN_INVARIANT_RATIO

    def on_swap(self, swap_params: SwapParams) -> int:
        multiplier_time = self.quant_amm_state.current_timestamp

        if (
            self.quant_amm_state.current_timestamp
            >= self.quant_amm_state.last_interop_time
        ):
            multiplier_time = self.quant_amm_state.last_interop_time

        time_since_last_update = multiplier_time - self.quant_amm_state.last_update_time

        # Get current weights based on time interpolation
        token_in_weight, token_out_weight = self._get_normalized_weight_pair(
            swap_params.index_in,
            swap_params.index_out,
            time_since_last_update,
            self.weights,
            self.multipliers,
        )

        if swap_params.swap_kind.value == SwapKind.GIVENIN.value:
            # Check max trade size ratio
            if swap_params.amount_given_scaled18 > mul_down_fixed(
                swap_params.balances_live_scaled18[swap_params.index_in],
                self.quant_amm_state.max_trade_size_ratio,
            ):
                raise ValueError("MaxTradeSizeRatio exceeded")

            amount_out_scaled18 = compute_out_given_exact_in(
                swap_params.balances_live_scaled18[swap_params.index_in],
                token_in_weight,
                swap_params.balances_live_scaled18[swap_params.index_out],
                token_out_weight,
                swap_params.amount_given_scaled18,
            )

            # Check max trade size ratio for output
            if amount_out_scaled18 > mul_down_fixed(
                swap_params.balances_live_scaled18[swap_params.index_out],
                self.quant_amm_state.max_trade_size_ratio,
            ):
                raise ValueError("MaxTradeSizeRatio exceeded")

            return amount_out_scaled18

        # Swap Given Out
        # Check max trade size ratio for output
        if swap_params.amount_given_scaled18 > mul_down_fixed(
            swap_params.balances_live_scaled18[swap_params.index_out],
            self.quant_amm_state.max_trade_size_ratio,
        ):
            raise ValueError("MaxTradeSizeRatio exceeded")

        amount_in_scaled18 = compute_in_given_exact_out(
            swap_params.balances_live_scaled18[swap_params.index_in],
            token_in_weight,
            swap_params.balances_live_scaled18[swap_params.index_out],
            token_out_weight,
            swap_params.amount_given_scaled18,
        )

        # Check max trade size ratio for input
        if amount_in_scaled18 > mul_down_fixed(
            swap_params.balances_live_scaled18[swap_params.index_in],
            self.quant_amm_state.max_trade_size_ratio,
        ):
            raise ValueError("MaxTradeSizeRatio exceeded")

        return amount_in_scaled18

    def compute_invariant(
        self, balances_live_scaled18: List[int], rounding: Rounding
    ) -> int:
        multiplier_time = self.quant_amm_state.current_timestamp

        if (
            self.quant_amm_state.current_timestamp
            >= self.quant_amm_state.last_interop_time
        ):
            multiplier_time = self.quant_amm_state.last_interop_time

        time_since_last_update = multiplier_time - self.quant_amm_state.last_update_time

        normalized_weights = self._get_normalized_weights(
            time_since_last_update,
            self.weights,
            self.multipliers,
        )

        if rounding.value == Rounding.ROUND_UP.value:
            return compute_invariant_up(normalized_weights, balances_live_scaled18)
        return compute_invariant_down(normalized_weights, balances_live_scaled18)

    def compute_balance(
        self,
        balances_live_scaled18: List[int],
        token_in_index: int,
        invariant_ratio: int,
    ) -> int:
        multiplier_time = self.quant_amm_state.current_timestamp

        if (
            self.quant_amm_state.current_timestamp
            >= self.quant_amm_state.last_interop_time
        ):
            multiplier_time = self.quant_amm_state.last_interop_time

        time_since_last_update = multiplier_time - self.quant_amm_state.last_update_time

        normalized_weights = self._get_normalized_weights(
            time_since_last_update,
            self.weights,
            self.multipliers,
        )

        return compute_balance_out_given_invariant(
            balances_live_scaled18[token_in_index],
            normalized_weights[token_in_index],
            invariant_ratio,
        )

    def _get_normalized_weight_pair(
        self,
        index_in: int,
        index_out: int,
        time_since_last_update: int,
        weights: List[int],
        multipliers: List[int],
    ) -> tuple[int, int]:
        # Calculate weights based on time interpolation
        token_in_weight = calculate_block_normalised_weight(
            weights[index_in],
            multipliers[index_in],
            time_since_last_update,
        )

        token_out_weight = calculate_block_normalised_weight(
            weights[index_out],
            multipliers[index_out],
            time_since_last_update,
        )

        return token_in_weight, token_out_weight

    def _get_normalized_weights(
        self,
        time_since_last_update: int,
        weights: List[int],
        multipliers: List[int],
    ) -> List[int]:
        normalized_weights = [0] * len(weights)

        for i, _ in enumerate(weights):
            normalized_weights[i] = calculate_block_normalised_weight(
                weights[i],
                multipliers[i],
                time_since_last_update,
            )

        return normalized_weights

from dataclasses import dataclass, fields
from typing import List

from src.common.base_pool_state import BasePoolState


@dataclass
class QuantAmmMutable:
    first_four_weights_and_multipliers: List[int]
    second_four_weights_and_multipliers: List[int]
    last_update_time: int
    last_interop_time: int
    current_timestamp: int


@dataclass
class QuantAmmImmutable:
    max_trade_size_ratio: int


@dataclass
class QuantAmmState(BasePoolState, QuantAmmMutable, QuantAmmImmutable):
    def __init__(self, **kwargs):
        # Set pool_type before initializing BasePoolState
        kwargs["pool_type"] = "QUANT_AMM_WEIGHTED"

        # Get BasePoolState fields
        base_fields = {f.name for f in fields(BasePoolState)}
        base_kwargs = {k: v for k, v in kwargs.items() if k in base_fields}

        # Initialize BasePoolState with its fields
        super().__init__(**base_kwargs)

        # Get QuantAmmMutable and QuantAmmImmutable fields
        mutable_fields = {f.name for f in fields(QuantAmmMutable)}
        immutable_fields = {f.name for f in fields(QuantAmmImmutable)}

        # Set QuantAmmMutable fields
        for field in mutable_fields:
            if field in kwargs:
                setattr(self, field, kwargs[field])

        # Set QuantAmmImmutable fields
        for field in immutable_fields:
            if field in kwargs:
                setattr(self, field, kwargs[field])


def map_quant_amm_state(pool_state: dict) -> QuantAmmState:
    """
    Map a dictionary to a QuantAmmState object
    Args:
        pool_state: Dictionary containing pool state data
    Returns:
        QuantAmmState object
    """
    return QuantAmmState(
        pool_address=pool_state["poolAddress"],
        tokens=pool_state["tokens"],
        scaling_factors=pool_state["scalingFactors"],
        token_rates=pool_state["tokenRates"],
        balances_live_scaled18=pool_state["balancesLiveScaled18"],
        swap_fee=pool_state["swapFee"],
        aggregate_swap_fee=pool_state.get("aggregateSwapFee", 0),
        total_supply=pool_state["totalSupply"],
        supports_unbalanced_liquidity=pool_state.get(
            "supportsUnbalancedLiquidity", True
        ),
        hook_type=pool_state.get("hookType"),
        first_four_weights_and_multipliers=pool_state["firstFourWeightsAndMultipliers"],
        second_four_weights_and_multipliers=pool_state[
            "secondFourWeightsAndMultipliers"
        ],
        last_update_time=pool_state["lastUpdateTime"],
        last_interop_time=pool_state["lastInteropTime"],
        current_timestamp=pool_state["currentTimestamp"],
        max_trade_size_ratio=pool_state["maxTradeSizeRatio"],
    )

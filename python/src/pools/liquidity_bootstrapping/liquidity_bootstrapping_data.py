from dataclasses import dataclass, fields
from typing import List

from src.common.base_pool_state import BasePoolState


@dataclass
class LiquidityBootstrappingMutable:
    is_swap_enabled: bool
    current_timestamp: int


@dataclass
class LiquidityBootstrappingImmutable:
    project_token_index: int
    is_project_token_swap_in_blocked: bool
    start_weights: List[int]
    end_weights: List[int]
    start_time: int
    end_time: int


@dataclass
class LiquidityBootstrappingState(
    BasePoolState, LiquidityBootstrappingMutable, LiquidityBootstrappingImmutable
):
    def __init__(self, **kwargs):
        kwargs["pool_type"] = "LIQUIDITY_BOOTSTRAPPING"
        base_fields = {f.name for f in fields(BasePoolState)}
        base_kwargs = {k: v for k, v in kwargs.items() if k in base_fields}
        super().__init__(**base_kwargs)

        mutable_fields = {f.name for f in fields(LiquidityBootstrappingMutable)}
        immutable_fields = {f.name for f in fields(LiquidityBootstrappingImmutable)}

        for field in mutable_fields:
            if field in kwargs:
                setattr(self, field, kwargs[field])
        for field in immutable_fields:
            if field in kwargs:
                setattr(self, field, kwargs[field])


def map_liquidity_bootstrapping_state(pool_state: dict) -> LiquidityBootstrappingState:
    return LiquidityBootstrappingState(
        pool_address=pool_state["poolAddress"],
        tokens=pool_state["tokens"],
        scaling_factors=pool_state["scalingFactors"],
        token_rates=pool_state["tokenRates"],
        balances_live_scaled18=pool_state["balancesLiveScaled18"],
        swap_fee=pool_state["swapFee"],
        aggregate_swap_fee=pool_state.get("aggregateSwapFee", 0),
        total_supply=pool_state["totalSupply"],
        supports_unbalanced_liquidity=pool_state.get(
            "supportsUnbalancedLiquidity", False
        ),
        hook_type=pool_state.get("hookType", None),
        project_token_index=pool_state["projectTokenIndex"],
        is_project_token_swap_in_blocked=pool_state["isProjectTokenSwapInBlocked"],
        start_weights=pool_state["startWeights"],
        end_weights=pool_state["endWeights"],
        start_time=pool_state["startTime"],
        end_time=pool_state["endTime"],
        is_swap_enabled=pool_state["isSwapEnabled"],
        current_timestamp=pool_state["currentTimestamp"],
    )

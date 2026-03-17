from dataclasses import dataclass, fields
from typing import List

from src.common.base_pool_state import BasePoolState


@dataclass
class FixedPriceLBPMutable:
    is_swap_enabled: bool
    current_timestamp: int


@dataclass
class FixedPriceLBPImmutable:
    project_token_index: int
    reserve_token_index: int
    project_token_rate: int
    start_time: int
    end_time: int


@dataclass
class FixedPriceLBPState(BasePoolState, FixedPriceLBPMutable, FixedPriceLBPImmutable):
    def __init__(self, **kwargs):
        kwargs["pool_type"] = "FIXED_PRICE_LBP"
        base_fields = {f.name for f in fields(BasePoolState)}
        base_kwargs = {k: v for k, v in kwargs.items() if k in base_fields}
        super().__init__(**base_kwargs)

        mutable_fields = {f.name for f in fields(FixedPriceLBPMutable)}
        immutable_fields = {f.name for f in fields(FixedPriceLBPImmutable)}

        for field in mutable_fields:
            if field in kwargs:
                setattr(self, field, kwargs[field])
        for field in immutable_fields:
            if field in kwargs:
                setattr(self, field, kwargs[field])


def map_fixed_price_lbp_state(pool_state: dict) -> FixedPriceLBPState:
    return FixedPriceLBPState(
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
        reserve_token_index=pool_state["reserveTokenIndex"],
        project_token_rate=pool_state["projectTokenRate"],
        start_time=pool_state["startTime"],
        end_time=pool_state["endTime"],
        is_swap_enabled=pool_state["isSwapEnabled"],
        current_timestamp=pool_state["currentTimestamp"],
    )

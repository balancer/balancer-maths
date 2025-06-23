from dataclasses import dataclass, fields
from typing import List

from src.common.base_pool_state import BasePoolState


@dataclass
class ReClammMutable:
    last_virtual_balances: List[int]
    daily_price_shift_base: int
    last_timestamp: int
    current_timestamp: int
    centeredness_margin: int
    start_fourth_root_price_ratio: int
    end_fourth_root_price_ratio: int
    price_ratio_update_start_time: int
    price_ratio_update_end_time: int


@dataclass
class ReClammState(BasePoolState, ReClammMutable):

    def __init__(self, **kwargs):
        # Set pool_type before initializing BasePoolState
        kwargs["pool_type"] = "RECLAMM"

        # Get BasePoolState fields
        base_fields = {f.name for f in fields(BasePoolState)}
        base_kwargs = {k: v for k, v in kwargs.items() if k in base_fields}

        # Initialize BasePoolState with its fields
        super().__init__(**base_kwargs)

        # Get ReClammState fields
        custom_fields = {f.name for f in fields(ReClammMutable)}

        # Set ReClammState fields
        for field in custom_fields:
            if field in kwargs:
                setattr(self, field, kwargs[field])


def map_re_clamm_state(pool_state: dict) -> ReClammState:
    return ReClammState(
        # BasePoolState fields
        pool_address=pool_state["poolAddress"],
        tokens=pool_state["tokens"],
        scaling_factors=pool_state["scalingFactors"],
        token_rates=pool_state["tokenRates"],
        balances_live_scaled18=pool_state["balancesLiveScaled18"],
        swap_fee=pool_state["swapFee"],
        aggregate_swap_fee=pool_state["aggregateSwapFee"],
        total_supply=pool_state["totalSupply"],
        supports_unbalanced_liquidity=False,
        hook_type=None,
        # ReClammMutable fields
        last_virtual_balances=[int(x) for x in pool_state["lastVirtualBalances"]],
        daily_price_shift_base=int(pool_state["dailyPriceShiftBase"]),
        last_timestamp=int(pool_state["lastTimestamp"]),
        current_timestamp=int(pool_state["currentTimestamp"]),
        centeredness_margin=int(pool_state["centerednessMargin"]),
        start_fourth_root_price_ratio=int(pool_state["startFourthRootPriceRatio"]),
        end_fourth_root_price_ratio=int(pool_state["endFourthRootPriceRatio"]),
        price_ratio_update_start_time=int(pool_state["priceRatioUpdateStartTime"]),
        price_ratio_update_end_time=int(pool_state["priceRatioUpdateEndTime"]),
    )

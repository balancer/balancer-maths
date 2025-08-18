from dataclasses import dataclass, fields

from src.common.base_pool_state import BasePoolState


@dataclass
class StableMutable:
    amp: int


@dataclass
class StableState(BasePoolState, StableMutable):
    def __init__(self, **kwargs):
        # Set pool_type before initializing BasePoolState
        kwargs["pool_type"] = "STABLE"

        # Get BasePoolState fields
        base_fields = {f.name for f in fields(BasePoolState)}
        base_kwargs = {k: v for k, v in kwargs.items() if k in base_fields}

        # Initialize BasePoolState with its fields
        super().__init__(**base_kwargs)

        # Get StableState fields
        custom_fields = {f.name for f in fields(StableMutable)}

        # Set StableState fields
        for field in custom_fields:
            if field in kwargs:
                setattr(self, field, kwargs[field])


def map_stable_state(pool_state: dict) -> StableState:
    return StableState(
        # BasePoolState fields
        pool_address=pool_state["poolAddress"],
        tokens=pool_state["tokens"],
        scaling_factors=pool_state["scalingFactors"],
        token_rates=pool_state["tokenRates"],
        balances_live_scaled18=pool_state["balancesLiveScaled18"],
        swap_fee=pool_state["swapFee"],
        aggregate_swap_fee=pool_state["aggregateSwapFee"],
        total_supply=pool_state["totalSupply"],
        supports_unbalanced_liquidity=pool_state.get(
            "supportsUnbalancedLiquidity", True
        ),
        hook_type=pool_state.get("hookType", None),
        # StableState fields
        amp=pool_state["amp"],
    )

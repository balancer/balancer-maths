from dataclasses import dataclass, fields

from src.common.base_pool_state import BasePoolState


@dataclass
class GyroECLPImmutable:
    alpha: int
    beta: int
    c: int
    s: int
    lambda_: int
    tau_alpha_x: int
    tau_alpha_y: int
    tau_beta_x: int
    tau_beta_y: int
    u: int
    v: int
    w: int
    z: int
    d_sq: int


@dataclass
class GyroECLPState(BasePoolState, GyroECLPImmutable):
    def __init__(self, **kwargs):
        # Set pool_type before initializing BasePoolState
        kwargs["pool_type"] = "GYROE"

        # Get BasePoolState fields
        base_fields = {f.name for f in fields(BasePoolState)}
        base_kwargs = {k: v for k, v in kwargs.items() if k in base_fields}

        # Initialize BasePoolState with its fields
        super().__init__(**base_kwargs)

        # Get GyroECLPState fields
        custom_fields = {f.name for f in fields(GyroECLPImmutable)}

        # Set GyroECLPState fields
        for field in custom_fields:
            if field in kwargs:
                setattr(self, field, kwargs[field])


def map_gyro_eclp_state(pool_state: dict) -> GyroECLPState:
    return GyroECLPState(
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
        # GyroECLPImmutable fields
        alpha=pool_state["paramsAlpha"],
        beta=pool_state["paramsBeta"],
        c=pool_state["paramsC"],
        s=pool_state["paramsS"],
        lambda_=pool_state["paramsLambda"],
        tau_alpha_x=pool_state["tauAlphaX"],
        tau_alpha_y=pool_state["tauAlphaY"],
        tau_beta_x=pool_state["tauBetaX"],
        tau_beta_y=pool_state["tauBetaY"],
        u=pool_state["u"],
        v=pool_state["v"],
        w=pool_state["w"],
        z=pool_state["z"],
        d_sq=pool_state["dSq"],
    )

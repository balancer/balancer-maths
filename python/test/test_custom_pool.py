from dataclasses import dataclass, fields
from typing import List

from src.common.base_pool_state import BasePoolState
from src.common.maths import Rounding
from src.common.pool_base import PoolBase
from src.common.swap_params import SwapParams
from src.common.types import SwapInput, SwapKind
from src.vault.vault import Vault


@dataclass
class CustomPoolState(BasePoolState):
    randoms: List[int]

    def __init__(self, **kwargs):
        # Set pool_type before initializing BasePoolState
        kwargs["pool_type"] = "CustomPool"

        # Get BasePoolState fields
        base_fields = {f.name for f in fields(BasePoolState)}
        base_kwargs = {k: v for k, v in kwargs.items() if k in base_fields}

        # Initialize BasePoolState with its fields
        super().__init__(**base_kwargs)

        # Get CustomPoolState fields
        custom_fields = {f.name for f in fields(CustomPoolState)}
        custom_fields = custom_fields - base_fields  # Remove base fields

        # Set CustomPoolState fields
        for field in custom_fields:
            if field in kwargs:
                setattr(self, field, kwargs[field])


def test_custom_pool():
    pool_state = {
        "poolType": "CustomPool",
        "hookType": None,
        "blockNumber": "5955145",
        "poolAddress": "0xb2456a6f51530053bc41b0ee700fe6a2c37282e8",
        "tokens": [
            "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9",
            "0xb19382073c7A0aDdbb56Ac6AF1808Fa49e377B75",
        ],
        "scalingFactors": [1, 1],
        "weights": [500000000000000000, 500000000000000000],
        "swapFee": 0,
        "balancesLiveScaled18": [64604926441576011, 46686842105263157924],
        "tokenRates": [1000000000000000000, 1000000000000000000],
        "totalSupply": 1736721048412749353,
        "randoms": [7000000000000000000, 8000000000000000000],
        "aggregateSwapFee": 0,
    }
    custom_pool_state = map_custom_pool_state(pool_state)
    vault = Vault(custom_pool_classes={"CustomPool": CustomPool})
    calculated_amount = vault.swap(
        swap_input=SwapInput(
            amount_raw=1000000000000000000,
            token_in="0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9",
            token_out="0xb19382073c7A0aDdbb56Ac6AF1808Fa49e377B75",
            swap_kind=SwapKind.GIVENIN,
        ),
        pool_state=custom_pool_state,
    )
    assert calculated_amount == custom_pool_state.randoms[0]


class CustomPool(PoolBase):
    def __init__(self, pool_state: CustomPoolState):
        self.pool_state = pool_state

    def on_swap(self, swap_params: SwapParams) -> int:
        return self.pool_state.randoms[0]

    def compute_invariant(
        self, balances_live_scaled18: List[int], rounding: Rounding
    ) -> int:
        return 1

    def compute_balance(
        self,
        balances_live_scaled18: List[int],
        token_in_index: int,
        invariant_ratio: int,
    ) -> int:
        return 1

    def get_maximum_invariant_ratio(self) -> int:
        return 1

    def get_minimum_invariant_ratio(self) -> int:
        return 1


def map_custom_pool_state(pool_state: dict) -> CustomPoolState:
    return CustomPoolState(
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
        hook_type=pool_state["hookType"],
        # CustomPoolState fields
        randoms=pool_state["randoms"],
    )

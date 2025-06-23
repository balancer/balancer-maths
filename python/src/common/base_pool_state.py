from dataclasses import dataclass
from typing import List, Optional


@dataclass
class BasePoolState:
    pool_address: str
    pool_type: str
    tokens: List[str]
    scaling_factors: List[int]
    token_rates: List[int]
    balances_live_scaled18: List[int]
    swap_fee: int
    aggregate_swap_fee: int
    total_supply: int
    supports_unbalanced_liquidity: bool
    hook_type: Optional[str]

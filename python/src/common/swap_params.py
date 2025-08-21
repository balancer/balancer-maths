from dataclasses import dataclass
from typing import List

from src.common.types import SwapKind


@dataclass
class SwapParams:
    swap_kind: SwapKind
    balances_live_scaled18: List[int]
    index_in: int
    index_out: int
    amount_given_scaled18: int

from dataclasses import dataclass
from enum import Enum

from src.common.base_pool_state import BasePoolState
from src.pools.gyro.gyro_2clp_data import Gyro2CLPState
from src.pools.gyro.gyro_eclp_data import GyroECLPState
from src.pools.quantamm.quantamm_data import QuantAmmState
from src.pools.reclamm.reclamm_data import ReClammState
from src.pools.reclamm_v2.reclamm_v2_data import ReClammV2State
from src.pools.stable.stable_data import StableState
from src.pools.weighted.weighted_data import WeightedState


class AddLiquidityKind(Enum):
    UNBALANCED = 0
    SINGLE_TOKEN_EXACT_OUT = 1


@dataclass
class AddLiquidityInput:
    pool: str
    max_amounts_in_raw: list[int]
    min_bpt_amount_out_raw: int
    kind: AddLiquidityKind


@dataclass
class AddLiquidityResult:
    bpt_amount_out_raw: int
    amounts_in_raw: list[int]


class RemoveLiquidityKind(Enum):
    PROPORTIONAL = 0
    SINGLE_TOKEN_EXACT_IN = 1
    SINGLE_TOKEN_EXACT_OUT = 2


@dataclass
class RemoveLiquidityInput:
    pool: str
    min_amounts_out_raw: list[int]
    max_bpt_amount_in_raw: int
    kind: RemoveLiquidityKind


@dataclass
class RemoveLiquidityResult:
    bpt_amount_in_raw: int
    amounts_out_raw: list[int]


class SwapKind(Enum):
    GIVENIN = 0
    GIVENOUT = 1


@dataclass
class SwapInput:
    amount_raw: int
    swap_kind: SwapKind
    token_in: str
    token_out: str


@dataclass
class SwapResult:
    amount_out_raw: int


PoolState = (
    BasePoolState
    | WeightedState
    | StableState
    | Gyro2CLPState
    | GyroECLPState
    | ReClammState
    | ReClammV2State
    | QuantAmmState
)

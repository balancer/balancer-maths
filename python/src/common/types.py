from dataclasses import dataclass
from enum import Enum

from src.common.base_pool_state import BasePoolState
from src.pools.gyro.gyro2CLP_data import Gyro2CLPState
from src.pools.gyro.gyroECLP_data import GyroECLPState
from src.pools.reclamm.reclamm_data import ReClammState
from src.pools.stable.stable_data import StableState
from src.pools.weighted.weighted_data import WeightedState


class RemoveLiquidityKind(Enum):
    PROPORTIONAL = 0
    SINGLE_TOKEN_EXACT_IN = 1
    SINGLE_TOKEN_EXACT_OUT = 2


class SwapKind(Enum):
    GIVENIN = 0
    GIVENOUT = 1


class AddLiquidityKind(Enum):
    UNBALANCED = 0
    SINGLE_TOKEN_EXACT_OUT = 1


@dataclass
class RemoveLiquidityInput:
    """Input parameters for a remove liquidity operation.

    Attributes:
        min_amounts_out_raw: List of minimum amounts of each token to receive
        max_bpt_amount_in_raw: Maximum amount of BPT to burn
        kind: The type of remove liquidity operation (PROPORTIONAL, SINGLE_TOKEN_EXACT_IN, or SINGLE_TOKEN_EXACT_OUT)
    """

    pool: str
    min_amounts_out_raw: list[int]
    max_bpt_amount_in_raw: int
    kind: RemoveLiquidityKind


@dataclass
class SwapInput:
    """Input parameters for a swap operation.

    Attributes:
        amount_raw: The raw amount being swapped
        swap_kind: The type of swap (GIVENIN or GIVENOUT)
        token_in: Address of the input token
        token_out: Address of the output token
    """

    amount_raw: int
    swap_kind: SwapKind
    token_in: str
    token_out: str


@dataclass
class AddLiquidityInput:
    """Input parameters for an add liquidity operation.

    Attributes:
        max_amounts_in_raw: List of maximum amounts of each token to add
        min_bpt_amount_out_raw: Minimum amount of BPT to receive
        kind: The type of add liquidity operation (UNBALANCED or SINGLE_TOKEN_EXACT_OUT)
    """

    pool: str
    max_amounts_in_raw: list[int]
    min_bpt_amount_out_raw: int
    kind: AddLiquidityKind


PoolState = (
    BasePoolState
    | WeightedState
    | StableState
    | Gyro2CLPState
    | GyroECLPState
    | ReClammState
)

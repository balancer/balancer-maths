from dataclasses import dataclass
from enum import Enum
from typing import List


class RemoveLiquidityKind(Enum):
    PROPORTIONAL = 0
    SINGLE_TOKEN_EXACT_IN = 1
    SINGLE_TOKEN_EXACT_OUT = 2


class SwapKind(Enum):
    GIVENIN = 0
    GIVENOUT = 1


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
class SwapParams:
    """Parameters for a swap operation in a pool.

    Attributes:
        swap_kind: The type of swap (GIVENIN or GIVENOUT)
        amount_given_scaled18: The amount being swapped, scaled to 18 decimals
        balances_live_scaled18: Current pool balances scaled to 18 decimals
        index_in: Index of the input token in the pool's token list
        index_out: Index of the output token in the pool's token list
    """

    swap_kind: SwapKind
    amount_given_scaled18: int
    balances_live_scaled18: List[int]
    index_in: int
    index_out: int

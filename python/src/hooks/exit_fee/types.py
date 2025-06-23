from dataclasses import dataclass


@dataclass
class ExitFeeHookState:
    remove_liquidity_hook_fee_percentage: int
    tokens: list[str]
    hook_type: str = "ExitFee"

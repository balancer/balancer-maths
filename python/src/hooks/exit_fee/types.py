from dataclasses import dataclass


@dataclass
class ExitFeeHookState:
    remove_liquidity_hook_fee_percentage: int
    tokens: list[str]
    hook_type: str = "ExitFee"


def map_exit_fee_hook_state(hook_data: dict, tokens: list[str]) -> ExitFeeHookState:
    """
    Maps EXIT_FEE hook data to ExitFeeHookState.

    Args:
        hook_data: Raw hook dict from JSON with dynamicData containing
                   removeLiquidityHookFeePercentage
        tokens: List of token addresses from pool data

    Returns:
        ExitFeeHookState object

    Raises:
        ValueError: If required fields are missing
    """
    if "dynamicData" not in hook_data:
        raise ValueError("EXIT_FEE hook requires dynamicData")

    dynamic_data = hook_data["dynamicData"]
    if "removeLiquidityHookFeePercentage" not in dynamic_data:
        raise ValueError(
            "EXIT_FEE hook requires removeLiquidityHookFeePercentage in dynamicData"
        )

    return ExitFeeHookState(
        remove_liquidity_hook_fee_percentage=int(
            dynamic_data["removeLiquidityHookFeePercentage"]
        ),
        tokens=tokens,
    )

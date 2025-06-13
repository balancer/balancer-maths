from dataclasses import dataclass


@dataclass
class StableSurgeHookState:
    surge_threshold_percentage: int
    max_surge_fee_percentage: int
    amp: int
    hook_type: str = "StableSurge"


def map_stable_surge_hook_state(hook_state: dict) -> StableSurgeHookState:
    return StableSurgeHookState(
        surge_threshold_percentage=hook_state["surgeThresholdPercentage"],
        max_surge_fee_percentage=hook_state["maxSurgeFeePercentage"],
        amp=hook_state["amp"],
    )

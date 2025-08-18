from src.common.types import SwapInput, SwapKind
from src.hooks.stable_surge.types import map_stable_surge_hook_state
from src.pools.stable.stable_data import map_stable_state
from src.vault.vault import Vault

pool_state = {
    "poolType": "STABLE",
    "hookType": "StableSurge",
    "poolAddress": "0x132F4bAa39330d9062fC52d81dF72F601DF8C01f",
    "tokens": [
        "0x7b79995e5f793a07bc00c21412e50ecae098e7f9",
        "0xb19382073c7a0addbb56ac6af1808fa49e377b75",
    ],
    "scalingFactors": [1, 1],
    "swapFee": 10000000000000000,
    "aggregateSwapFee": 10000000000000000,
    "balancesLiveScaled18": [10000000000000000, 10000000000000000000],
    "tokenRates": [1000000000000000000, 1000000000000000000],
    "totalSupply": 9079062661965173292,
    "amp": 1000000,
    "supportsUnbalancedLiquidity": True,
}

hook_state = map_stable_surge_hook_state(
    {
        "hookType": "StableSurge",
        "surgeThresholdPercentage": 300000000000000000,
        "maxSurgeFeePercentage": 950000000000000000,
        "amp": pool_state["amp"],
    }
)

vault = Vault()
stable_state = map_stable_state(pool_state)


def test_below_surge_threshold_static_swap_fee_case1():
    swap_input = SwapInput(
        swap_kind=SwapKind.GIVENIN,
        amount_raw=1000000000000000,
        token_in=pool_state["tokens"][0],
        token_out=pool_state["tokens"][1],
    )
    output_amount = vault.swap(
        swap_input=swap_input, pool_state=stable_state, hook_state=hook_state
    )
    assert output_amount == 78522716365403684


def test_below_surge_threshold_static_swap_fee_case2():
    swap_input = SwapInput(
        swap_kind=SwapKind.GIVENIN,
        amount_raw=10000000000000000,
        token_in=pool_state["tokens"][0],
        token_out=pool_state["tokens"][1],
    )
    output_amount = vault.swap(
        swap_input=swap_input, pool_state=stable_state, hook_state=hook_state
    )
    assert output_amount == 452983383563178802


def test_above_surge_threshold_uses_surge_fee():
    swap_input = SwapInput(
        swap_kind=SwapKind.GIVENIN,
        amount_raw=8000000000000000000,
        token_in=pool_state["tokens"][1],
        token_out=pool_state["tokens"][0],
    )
    output_amount = vault.swap(
        swap_input=swap_input, pool_state=stable_state, hook_state=hook_state
    )
    assert output_amount == 3252130027531260

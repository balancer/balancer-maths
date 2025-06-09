import sys
import os

from src.pools.weighted.weighted import Weighted
from src.common.types import (
    RemoveLiquidityKind,
    SwapKind,
    SwapInput,
    SwapParams,
    AddLiquidityKind,
)
from vault.vault import Vault
from hooks.types import (
    HookBase,
    AfterSwapParams,
    DynamicSwapFeeResult,
    BeforeSwapResult,
    AfterSwapResult,
    BeforeAddLiquidityResult,
    AfterAddLiquidityResult,
    BeforeRemoveLiquidityResult,
    AfterRemoveLiquidityResult,
)

# Get the directory of the current file
current_file_dir = os.path.dirname(os.path.abspath(__file__))
# Get the parent directory (one level up)
parent_dir = os.path.dirname(os.path.dirname(current_file_dir))

# Insert the parent directory at the start of sys.path
sys.path.insert(0, parent_dir)

pool = {
    "poolType": "CustomPool",
    "hookType": "CustomHook",
    "chainId": "11155111",
    "blockNumber": "5955145",
    "poolAddress": "0xb2456a6f51530053bc41b0ee700fe6a2c37282e8",
    "tokens": [
        "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9",
        "0xb19382073c7A0aDdbb56Ac6AF1808Fa49e377B75",
    ],
    "scalingFactors": [1, 1],
    "weights": [500000000000000000, 500000000000000000],
    "swapFee": 100000000000000000,
    "balancesLiveScaled18": [2000000000000000000, 2000000000000000000],
    "tokenRates": [1000000000000000000, 1000000000000000000],
    "totalSupply": 1000000000000000000,
    "aggregateSwapFee": 500000000000000000,
}


swap_input = SwapInput(
    amount_raw=100000000,
    swap_kind=SwapKind.GIVENIN,
    token_in=pool["tokens"][0],
    token_out=pool["tokens"][1],
)


class CustomPool(Weighted):
    def __init__(self, pool_state):
        super().__init__(pool_state)


class CustomHook(HookBase):
    def __init__(self):
        self.should_call_compute_dynamic_swap_fee = False
        self.should_call_before_swap = True
        self.should_call_after_swap = False
        self.should_call_before_add_liquidity = False
        self.should_call_after_add_liquidity = False
        self.should_call_before_remove_liquidity = False
        self.should_call_after_remove_liquidity = False
        self.enable_hook_adjusted_amounts = False

    def on_before_add_liquidity(
        self,
        kind: AddLiquidityKind,
        max_amounts_in_scaled18: list[int],
        min_bpt_amount_out: int,
        balances_scaled18: list[int],
        hook_state: dict,
    ) -> BeforeAddLiquidityResult:
        return BeforeAddLiquidityResult(
            success=False, hook_adjusted_balances_scaled18=[]
        )

    def on_after_add_liquidity(
        self,
        kind: AddLiquidityKind,
        amounts_in_scaled18: list[int],
        amounts_in_raw: list[int],
        bpt_amount_out: int,
        balances_scaled18: list[int],
        hook_state: dict,
    ) -> AfterAddLiquidityResult:
        return AfterAddLiquidityResult(success=False, hook_adjusted_amounts_in_raw=[])

    def on_before_remove_liquidity(
        self,
        kind: RemoveLiquidityKind,
        max_bpt_amount_in: int,
        min_amounts_out_scaled18: list[int],
        balances_scaled18: list[int],
        hook_state: dict,
    ) -> BeforeRemoveLiquidityResult:
        return BeforeRemoveLiquidityResult(
            success=False, hook_adjusted_balances_scaled18=[]
        )

    def on_after_remove_liquidity(
        self,
        kind: RemoveLiquidityKind,
        bpt_amount_in: int,
        amounts_out_scaled18: list[int],
        amounts_out_raw: list[int],
        balances_scaled18: list[int],
        hook_state: dict,
    ) -> AfterRemoveLiquidityResult:
        return AfterRemoveLiquidityResult(
            success=False, hook_adjusted_amounts_out_raw=[]
        )

    def on_before_swap(self, swap_params: SwapParams, hook_state):
        if not (
            isinstance(hook_state, dict)
            and hook_state is not None
            and "balanceChange" in hook_state
        ):
            raise ValueError("Unexpected hookState")
        assert swap_params.swap_kind == swap_input.swap_kind
        assert swap_params.index_in == 0
        assert swap_params.index_out == 1
        return BeforeSwapResult(
            success=True,
            hook_adjusted_balances_scaled18=hook_state["balanceChange"],
        )

    def on_after_swap(
        self,
        after_swap_params: AfterSwapParams,
        hook_state: dict,
    ) -> AfterSwapResult:
        return AfterSwapResult(success=False, hook_adjusted_amount_calculated_raw=0)

    def on_compute_dynamic_swap_fee(
        self,
        swap_params: SwapParams,
        static_swap_fee_percentage: int,
        hook_state: dict,
    ) -> DynamicSwapFeeResult:
        return DynamicSwapFeeResult(success=False, dynamic_swap_fee=0)


vault = Vault(
    custom_pool_classes={"CustomPool": CustomPool},
    custom_hook_classes={"CustomHook": CustomHook},
)


def test_before_swap():
    # should alter pool balances
    # hook state is used to pass new balances which give expected swap result
    input_hook_state = {
        "balanceChange": [1000000000000000000, 1000000000000000000],
    }
    test = vault.swap(swap_input, pool, hook_state=input_hook_state)
    assert test == 89999999

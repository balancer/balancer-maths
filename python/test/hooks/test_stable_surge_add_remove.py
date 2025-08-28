# pytest test/hooks/test_stable_surge_add_remove.py --capture=no
# pytest test/hooks/test_stable_surge_add_remove.py::TestStableSurgeAddRemove::test_pool_surging_unbalanced_add_liquidity_throws --capture=no
import pytest

from src.common.types import (
    AddLiquidityInput,
    AddLiquidityKind,
    RemoveLiquidityInput,
    RemoveLiquidityKind,
)
from src.hooks.stable_surge.types import map_stable_surge_hook_state
from src.pools.stable.stable_data import map_stable_state
from src.vault.vault import Vault

pool_state = {
    "poolType": "STABLE",
    "hookType": "StableSurge",
    "poolAddress": "0x950682e741abd1498347a93b942463af4ec7132b",
    "tokens": [
        "0x99999999999999Cc837C997B882957daFdCb1Af9",
        "0xC71Ea051a5F82c67ADcF634c36FFE6334793D24C",
    ],
    "scalingFactors": [1, 1],
    "swapFee": 400000000000000,
    "totalSupply": 2557589757607855441,
    "balancesLiveScaled18": [1315930484174775273, 1307696122829730394],
    "tokenRates": [1101505915091109485, 1016263325751437314],
    "amp": 1000000,
    "aggregateSwapFee": 500000000000000000,
    "supportsUnbalancedLiquidity": True,
}

hook_state = map_stable_surge_hook_state(
    {
        "hookType": "StableSurge",
        "surgeThresholdPercentage": 20000000000000000,
        "maxSurgeFeePercentage": 50000000000000000,
        "amp": pool_state["amp"],
    }
)

vault = Vault()
stable_state = map_stable_state(pool_state)


class TestStableSurgeAddRemove:
    """Test stable surge hook with add and remove liquidity operations"""

    def test_pool_not_surging_unbalanced_add_liquidity_succeeds(self):
        """Test that unbalanced add liquidity succeeds when pool is not surging"""
        add_liquidity_input = AddLiquidityInput(
            pool="0x950682e741abd1498347a93b942463af4ec7132b",
            max_amounts_in_raw=[10000000000, 10000000000],
            min_bpt_amount_out_raw=0,
            kind=AddLiquidityKind.UNBALANCED,
        )
        add_result = vault.add_liquidity(
            add_liquidity_input=add_liquidity_input,
            pool_state=stable_state,
            hook_state=hook_state,
        )
        assert add_result.bpt_amount_out_raw == 20644492894
        assert add_result.amounts_in_raw == add_liquidity_input.max_amounts_in_raw

    def test_pool_not_surging_single_token_exact_out_add_liquidity_succeeds(self):
        """Test that single token exact out add liquidity succeeds when pool is not surging"""
        add_liquidity_input = AddLiquidityInput(
            pool="0x950682e741abd1498347a93b942463af4ec7132b",
            max_amounts_in_raw=[10000000000, 0],
            min_bpt_amount_out_raw=10000000000,
            kind=AddLiquidityKind.SINGLE_TOKEN_EXACT_OUT,
        )
        add_result = vault.add_liquidity(
            add_liquidity_input=add_liquidity_input,
            pool_state=stable_state,
            hook_state=hook_state,
        )
        assert (
            add_result.bpt_amount_out_raw == add_liquidity_input.min_bpt_amount_out_raw
        )
        assert add_result.amounts_in_raw == [9314773070, 0]

    def test_pool_not_surging_proportional_remove_liquidity_succeeds(self):
        """Test that proportional remove liquidity succeeds when pool is not surging"""
        remove_liquidity_input = RemoveLiquidityInput(
            pool="0x950682e741abd1498347a93b942463af4ec7132b",
            max_bpt_amount_in_raw=100000000000000000,
            min_amounts_out_raw=[1, 1],
            kind=RemoveLiquidityKind.PROPORTIONAL,
        )
        remove_result = vault.remove_liquidity(
            remove_liquidity_input=remove_liquidity_input,
            pool_state=stable_state,
            hook_state=hook_state,
        )
        assert (
            remove_result.bpt_amount_in_raw
            == remove_liquidity_input.max_bpt_amount_in_raw
        )
        assert remove_result.amounts_out_raw == [46710576781505052, 50311781860935300]

    def test_pool_not_surging_single_token_exact_in_remove_liquidity_succeeds(self):
        """Test that single token exact in remove liquidity succeeds when pool is not surging"""
        remove_liquidity_input = RemoveLiquidityInput(
            pool="0x950682e741abd1498347a93b942463af4ec7132b",
            max_bpt_amount_in_raw=10000000000,
            min_amounts_out_raw=[1, 0],
            kind=RemoveLiquidityKind.SINGLE_TOKEN_EXACT_IN,
        )
        remove_result = vault.remove_liquidity(
            remove_liquidity_input=remove_liquidity_input,
            pool_state=stable_state,
            hook_state=hook_state,
        )
        assert (
            remove_result.bpt_amount_in_raw
            == remove_liquidity_input.max_bpt_amount_in_raw
        )
        assert remove_result.amounts_out_raw == [9311058836, 0]

    def test_pool_not_surging_single_token_exact_out_remove_liquidity_succeeds(self):
        """Test that single token exact out remove liquidity succeeds when pool is not surging"""
        remove_liquidity_input = RemoveLiquidityInput(
            pool="0x950682e741abd1498347a93b942463af4ec7132b",
            max_bpt_amount_in_raw=10000000000,
            min_amounts_out_raw=[10000000, 0],
            kind=RemoveLiquidityKind.SINGLE_TOKEN_EXACT_OUT,
        )
        remove_result = vault.remove_liquidity(
            remove_liquidity_input=remove_liquidity_input,
            pool_state=stable_state,
            hook_state=hook_state,
        )
        assert remove_result.bpt_amount_in_raw == 10739922
        assert (
            remove_result.amounts_out_raw == remove_liquidity_input.min_amounts_out_raw
        )

    def test_pool_surging_unbalanced_add_liquidity_throws(self):
        """Test that unbalanced add liquidity throws when pool is surging"""
        add_liquidity_input = AddLiquidityInput(
            pool="0x950682e741abd1498347a93b942463af4ec7132b",
            max_amounts_in_raw=[10000000, 100000000000000000],
            min_bpt_amount_out_raw=0,
            kind=AddLiquidityKind.UNBALANCED,
        )

        with pytest.raises(Exception, match="AfterAddLiquidityHookFailed"):
            vault.add_liquidity(
                add_liquidity_input=add_liquidity_input,
                pool_state=stable_state,
                hook_state=hook_state,
            )

    def test_pool_surging_single_token_exact_out_add_liquidity_throws(self):
        """Test that single token exact out add liquidity throws when pool is surging"""
        add_liquidity_input = AddLiquidityInput(
            pool="0x950682e741abd1498347a93b942463af4ec7132b",
            max_amounts_in_raw=[100000000000000000, 0],
            min_bpt_amount_out_raw=100000000000000000,
            kind=AddLiquidityKind.SINGLE_TOKEN_EXACT_OUT,
        )

        with pytest.raises(Exception, match="AfterAddLiquidityHookFailed"):
            vault.add_liquidity(
                add_liquidity_input=add_liquidity_input,
                pool_state=stable_state,
                hook_state=hook_state,
            )

    def test_pool_surging_single_token_exact_in_remove_liquidity_throws(self):
        """Test that single token exact in remove liquidity throws when pool is surging"""
        remove_liquidity_input = RemoveLiquidityInput(
            pool="0x950682e741abd1498347a93b942463af4ec7132b",
            max_bpt_amount_in_raw=100000000000000000,
            min_amounts_out_raw=[1, 0],
            kind=RemoveLiquidityKind.SINGLE_TOKEN_EXACT_IN,
        )

        with pytest.raises(Exception, match="AfterRemoveLiquidityHookFailed"):
            vault.remove_liquidity(
                remove_liquidity_input=remove_liquidity_input,
                pool_state=stable_state,
                hook_state=hook_state,
            )

    def test_pool_surging_single_token_exact_out_remove_liquidity_throws(self):
        """Test that single token exact out remove liquidity throws when pool is surging"""
        remove_liquidity_input = RemoveLiquidityInput(
            pool="0x950682e741abd1498347a93b942463af4ec7132b",
            max_bpt_amount_in_raw=100000000000000000,
            min_amounts_out_raw=[100000000000000000, 0],
            kind=RemoveLiquidityKind.SINGLE_TOKEN_EXACT_OUT,
        )

        with pytest.raises(Exception, match="AfterRemoveLiquidityHookFailed"):
            vault.remove_liquidity(
                remove_liquidity_input=remove_liquidity_input,
                pool_state=stable_state,
                hook_state=hook_state,
            )

from pools.buffer.buffer_data import BufferState
from src.common.types import (
    AddLiquidityInput,
    PoolState,
    RemoveLiquidityInput,
    SwapInput,
)
from src.common.pool_base import PoolBase
from src.hooks.default_hook import DefaultHook
from src.hooks.exit_fee.exit_fee_hook import ExitFeeHook
from src.hooks.stable_surge.stable_surge_hook import StableSurgeHook
from src.hooks.types import HookBase, HookState
from src.pools.buffer.erc4626_buffer_wrap_or_unwrap import erc4626_buffer_wrap_or_unwrap
from src.pools.gyro.gyro2CLP import Gyro2CLP
from src.pools.gyro.gyroECLP import GyroECLP
from src.pools.reclamm.reclamm import ReClamm
from src.pools.stable.stable import Stable
from src.pools.weighted.weighted import Weighted
from src.vault.swap import swap
from src.vault.add_liquidity import add_liquidity
from src.vault.remove_liquidity import remove_liquidity


class Vault:
    def __init__(self, *, custom_pool_classes=None, custom_hook_classes=None):
        self.pool_classes = {
            "WEIGHTED": Weighted,
            "STABLE": Stable,
            "GYRO": Gyro2CLP,
            "GYROE": GyroECLP,
            "RECLAMM": ReClamm,
        }
        self.hook_classes = {"ExitFee": ExitFeeHook, "StableSurge": StableSurgeHook}
        if custom_pool_classes is not None:
            self.pool_classes.update(custom_pool_classes)

        if custom_hook_classes is not None:
            self.hook_classes.update(custom_hook_classes)

    def swap(
        self,
        *,
        swap_input: SwapInput,
        pool_state: PoolState | BufferState,
        hook_state: HookState | object | None = None,
    ):
        if swap_input.amount_raw == 0:
            return 0

        # buffer is handled separately than a "normal" pool
        if isinstance(pool_state, BufferState):
            return erc4626_buffer_wrap_or_unwrap(swap_input, pool_state)
        pool_class = self._get_pool(pool_state=pool_state)
        hook_class = self._get_hook(
            hook_name=pool_state.hook_type, hook_state=hook_state
        )
        return swap(swap_input, pool_state, pool_class, hook_class, hook_state)

    def add_liquidity(
        self,
        *,
        add_liquidity_input: AddLiquidityInput,
        pool_state: PoolState,
        hook_state: HookState | object | None = None,
    ):
        pool_class = self._get_pool(pool_state=pool_state)
        hook_class = self._get_hook(
            hook_name=pool_state.hook_type, hook_state=hook_state
        )
        return add_liquidity(
            add_liquidity_input, pool_state, pool_class, hook_class, hook_state
        )

    def remove_liquidity(
        self,
        *,
        remove_liquidity_input: RemoveLiquidityInput,
        pool_state: PoolState,
        hook_state: HookState | object | None = None,
    ):
        pool_class = self._get_pool(pool_state=pool_state)
        hook_class = self._get_hook(
            hook_name=pool_state.hook_type, hook_state=hook_state
        )
        return remove_liquidity(
            remove_liquidity_input, pool_state, pool_class, hook_class, hook_state
        )

    def _get_pool(self, *, pool_state: PoolState) -> PoolBase:
        pool_class = self.pool_classes[pool_state.pool_type]
        if pool_class is None:
            raise SystemError("Unsupported Pool Type: ", pool_state.pool_type)

        return pool_class(pool_state)

    def _get_hook(
        self, *, hook_name: str | None, hook_state: HookState | object | None
    ) -> HookBase:
        if hook_name is None:
            return DefaultHook()
        hook_class = self.hook_classes.get(hook_name, None)
        if hook_class is None:
            raise SystemError("Unsupported Hook Type:", hook_name)
        if hook_state is None:
            raise SystemError("No state for Hook:", hook_name)
        return hook_class()

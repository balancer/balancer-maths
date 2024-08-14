from .swap import swap
from .add_liquidity import add_liquidity
from .pools.weighted import Weighted
from .pools.buffer.erc4626_buffer_wrap_or_unwrap import erc4626_buffer_wrap_or_unwrap
from .pools.stable import Stable
from .hooks.default_hook import DefaultHook


class Vault:
    def __init__(self, *, custom_pool_classes=None, custom_hook_classes=None):
        self.pool_classes = {
            "Weighted": Weighted,
            "Stable": Stable,
        }
        if custom_pool_classes is not None:
            self.pool_classes.update(custom_pool_classes)

        self.hook_classes = {}
        if custom_hook_classes is not None:
            self.hook_classes.update(custom_hook_classes)

    def swap(self, swap_input, pool_state, *, hook_state=None):
        # buffer is handled separately than a "normal" pool
        if pool_state.get("totalSupply") is None:
            return erc4626_buffer_wrap_or_unwrap(swap_input, pool_state)
        pool_class = self._get_pool(pool_state)
        hook_class = self._get_hook(pool_state.get("hookType", None), hook_state)
        return swap(swap_input, pool_state, pool_class, hook_class, hook_state)

    def add_liquidity(self, add_liquidity_input, pool_state, *, hook_state=None):
        if pool_state["poolType"] == "Buffer":
            raise ValueError("Buffer pools do not support addLiquidity")

        pool_class = self._get_pool(pool_state)
        hook_class = self._get_hook(pool_state.get("hookType", None), hook_state)
        return add_liquidity(add_liquidity_input, pool_class, hook_class, hook_state)

    def _get_pool(self, pool_state):
        pool_class = self.pool_classes[pool_state["poolType"]]
        if pool_class is None:
            raise SystemError("Unsupported Pool Type: ", pool_state["poolType"])

        return pool_class(pool_state)

    def _get_hook(self, hook_name, hook_state):
        if hook_name is None:
            return DefaultHook()
        hook_class = self.hook_classes.get(hook_name, None)
        if hook_class is None:
            raise SystemError("Unsupported Hook Type:", hook_name)
        if hook_state is None:
            raise SystemError("No state for Hook:", hook_name)
        return hook_class(hook_state)

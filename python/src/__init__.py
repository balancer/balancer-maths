"""
Balancer Maths Python

Python implementation of mathematics for Balancer pools.
"""

__version__ = "0.1.0"

from .common.types import (
    AddLiquidityInput,
    AddLiquidityKind,
    RemoveLiquidityInput,
    RemoveLiquidityKind,
    SwapInput,
    SwapKind,
)

# Hook types
from .hooks.exit_fee.exit_fee_hook import ExitFeeHook
from .hooks.stable_surge.stable_surge_hook import StableSurgeHook

# Pool types - these are the actual class names from the codebase
from .pools.buffer.buffer_data import BufferState
from .pools.gyro.gyro_2clp import Gyro2CLP
from .pools.gyro.gyro_eclp import GyroECLP
from .pools.liquidity_bootstrapping.liquidity_bootstrapping import (
    LiquidityBootstrapping,
)
from .pools.quantamm.quantamm import QuantAmm
from .pools.reclamm.reclamm import ReClamm
from .pools.reclamm_v2.reclamm_v2 import ReClammV2
from .pools.stable.stable import Stable
from .pools.weighted.weighted import Weighted

# Main public API
from .vault.vault import Vault

__all__ = [
    # Core classes
    "Vault",
    "SwapInput",
    "SwapKind",
    "AddLiquidityInput",
    "AddLiquidityKind",
    "RemoveLiquidityInput",
    "RemoveLiquidityKind",
    # Pool types
    "Weighted",
    "Stable",
    "Gyro2CLP",
    "GyroECLP",
    "ReClamm",
    "ReClammV2",
    "LiquidityBootstrapping",
    "QuantAmm",
    "BufferState",
    # Hook types
    "ExitFeeHook",
    "StableSurgeHook",
]

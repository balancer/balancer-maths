from test.utils.map_hook_state import map_hook_state

from src.common.types import PoolState
from src.hooks.types import HookState
from src.pools.buffer.buffer_data import BufferState, map_buffer_state
from src.pools.gyro.gyro_2clp_data import map_gyro_2clp_state
from src.pools.gyro.gyro_eclp_data import map_gyro_eclp_state
from src.pools.liquidity_bootstrapping.liquidity_bootstrapping_data import (
    map_liquidity_bootstrapping_state,
)
from src.pools.quantamm.quantamm_data import map_quant_amm_state
from src.pools.reclamm.reclamm_data import map_re_clamm_state
from src.pools.reclamm_v2.reclamm_v2_data import map_re_clamm_v2_state
from src.pools.stable.stable_data import map_stable_state
from src.pools.weighted.weighted_data import map_weighted_state


def map_pool_state(pool_state: dict) -> PoolState | BufferState:
    if pool_state["poolType"] == "Buffer":
        return map_buffer_state(pool_state)
    elif pool_state["poolType"] == "GYRO":
        return map_gyro_2clp_state(pool_state)
    elif pool_state["poolType"] == "GYROE":
        return map_gyro_eclp_state(pool_state)
    elif pool_state["poolType"] == "QUANT_AMM_WEIGHTED":
        return map_quant_amm_state(pool_state)
    elif pool_state["poolType"] == "LIQUIDITY_BOOTSTRAPPING":
        return map_liquidity_bootstrapping_state(pool_state)
    elif pool_state["poolType"] == "RECLAMM":
        return map_re_clamm_state(pool_state)
    elif pool_state["poolType"] == "STABLE":
        return map_stable_state(pool_state)
    elif pool_state["poolType"] == "WEIGHTED":
        return map_weighted_state(pool_state)
    elif pool_state["poolType"] == "RECLAMM_V2":
        return map_re_clamm_v2_state(pool_state)
    else:
        raise ValueError(f"Unsupported pool type: {pool_state['poolType']}")


def transform_strings_to_ints(pool_with_strings):
    pool_with_ints = {}
    for key, value in pool_with_strings.items():
        if isinstance(value, dict):
            # Recursively transform nested dictionaries (e.g., hook object)
            pool_with_ints[key] = transform_strings_to_ints(value)
        elif isinstance(value, list):
            # Convert each element in the list to an integer, handling exceptions
            int_list = []
            for item in value:
                try:
                    int_list.append(int(item))
                except ValueError:
                    int_list = value
                    break
            pool_with_ints[key] = int_list
        else:
            try:
                pool_with_ints[key] = int(value)
            except (ValueError, TypeError):
                pool_with_ints[key] = value
    return pool_with_ints


def map_pool_and_hook_state(
    pool: dict,
) -> tuple[PoolState | BufferState, HookState | None]:
    """
    Maps pool data to pool state and hook state (if present).

    This function maps both the pool state and any associated hook state from
    the raw pool dictionary. Hook data is extracted and mapped only for pool
    types that support hooks (STABLE and WEIGHTED).

    Args:
        pool: Pool dict from JSON (already converted to ints via transform_strings_to_ints)

    Returns:
        Tuple of (pool_state, hook_state or None)
        - pool_state: Mapped PoolState or BufferState
        - hook_state: Mapped HookState if hook exists and pool supports it, None otherwise
    """
    # First, map the pool state
    pool_state = map_pool_state(pool)

    # Check if pool has hook data
    hook_data = pool.get("hook")
    if not hook_data:
        return (pool_state, None)

    # Map the hook state using the centralized mapper
    try:
        hook_state = map_hook_state(hook_data, pool)
        # Update pool state's hook_type so the vault can instantiate the correct hook
        # BufferState doesn't have hook_type, but we already filtered for STABLE/WEIGHTED
        if isinstance(pool_state, BufferState):
            # This shouldn't happen since we filter pool types above, but be safe
            return (pool_state, None)
        # Now type checker knows pool_state must be PoolState which has hook_type
        pool_state.hook_type = hook_state.hook_type
        return (pool_state, hook_state)
    except (KeyError, ValueError) as e:
        # If hook mapping fails, raise with context about which pool failed
        raise ValueError(
            f"Failed to map hook state for pool {pool.get('poolAddress', 'unknown')}: {e}"
        ) from e

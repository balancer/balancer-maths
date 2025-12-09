from test.utils.map_hook_state import map_hook_state
from test.utils.map_pool_state import map_pool_state
from hooks.types import HookState
from common.types import PoolState


def map_state(
    pool: dict,
) -> tuple[PoolState, HookState | None]:
    """
    Maps pool data to pool state and hook state (if present).

    Args:
        pool: Pool dict from JSON (already converted to ints via transform_strings_to_ints)

    Returns:
        Tuple of (pool_state, hook_state or None)
        - pool_state: Mapped PoolState
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
        pool_state.hook_type = hook_state.hook_type
        return (pool_state, hook_state)
    except (KeyError, ValueError) as e:
        # If hook mapping fails, raise with context about which pool failed
        raise ValueError(
            f"Failed to map hook state for pool {pool.get('poolAddress', 'unknown')}: {e}"
        ) from e

from common.types import PoolState
from pools.buffer.buffer_data import BufferState, map_buffer_state
from pools.gyro.gyro2CLP_data import map_gyro_2clp_state
from pools.gyro.gyroECLP_data import map_gyro_eclp_state
from pools.reclamm.reclamm_data import map_re_clamm_state
from pools.stable.stable_data import map_stable_state
from pools.weighted.weighted_data import map_weighted_state


def map_pool_state(pool_state: dict) -> PoolState | BufferState:
    if pool_state["poolType"] == "Buffer":
        return map_buffer_state(pool_state)
    elif pool_state["poolType"] == "GYRO":
        return map_gyro_2clp_state(pool_state)
    elif pool_state["poolType"] == "GYROE":
        return map_gyro_eclp_state(pool_state)
    elif pool_state["poolType"] == "RECLAMM":
        return map_re_clamm_state(pool_state)
    elif pool_state["poolType"] == "STABLE":
        return map_stable_state(pool_state)
    elif pool_state["poolType"] == "WEIGHTED":
        return map_weighted_state(pool_state)
    else:
        raise ValueError(f"Unsupported pool type: {pool_state['poolType']}")


def transform_strings_to_ints(pool_with_strings):
    pool_with_ints = {}
    for key, value in pool_with_strings.items():
        if isinstance(value, list):
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
            except ValueError:
                pool_with_ints[key] = value
    return pool_with_ints

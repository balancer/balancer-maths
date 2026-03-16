"""State loader for the pool simulator.

Loads pool and hook state from testData JSON files.
"""

from __future__ import annotations

import json
from test.utils.map_pool_state import map_pool_and_hook_state, transform_strings_to_ints
from typing import Optional, Tuple

from src.common.types import BufferState, PoolState
from src.hooks.types import HookState


class StateLoader:
    """Loads pool state from testData JSON files."""

    @staticmethod
    def from_json_file(filepath: str) -> Tuple[PoolState, Optional[HookState]]:
        """Load pool state from a testData JSON file.

        Args:
            filepath: Path to the JSON file containing pool data

        Returns:
            Tuple of (PoolState, Optional[HookState])

        Raises:
            FileNotFoundError: If the file does not exist
            json.JSONDecodeError: If the file is not valid JSON
            KeyError: If required keys are missing from the JSON
        """
        with open(filepath) as f:
            data = json.load(f)

        # Transform string amounts to integers
        pool_data = transform_strings_to_ints(data)

        # Map to PoolState and HookState
        pool_state, hook_state = map_pool_and_hook_state(pool_data)
        assert not isinstance(
            pool_state, BufferState
        ), "Simulator does not support buffer pools"
        return pool_state, hook_state

    @staticmethod
    def from_pool_dict(pool_dict: dict) -> Tuple[PoolState, Optional[HookState]]:
        """Load pool state from a dictionary (e.g., from testData["pools"]["poolName"]).

        Args:
            pool_dict: Dictionary containing pool data

        Returns:
            Tuple of (PoolState, Optional[HookState])
        """
        # Transform string amounts to integers
        pool_data = transform_strings_to_ints(pool_dict)

        # Map to PoolState and HookState
        pool_state, hook_state = map_pool_and_hook_state(pool_data)
        assert not isinstance(
            pool_state, BufferState
        ), "Simulator does not support buffer pools"
        return pool_state, hook_state

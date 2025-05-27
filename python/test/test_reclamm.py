import sys
import os

from src.pools.reclamm.reclamm import ReClamm
from src.common.types import SwapKind, SwapParams

# Get the directory of the current file
current_file_dir = os.path.dirname(os.path.abspath(__file__))
# Get the parent directory (one level up)
parent_dir = os.path.dirname(current_file_dir)
# Insert the parent directory at the start of sys.path
sys.path.insert(0, parent_dir)


def test_reclamm_swap():
    pool_state = {
        "poolType": "ReClamm",
        "chainId": "11155111",
        "blockNumber": "5955145",
        "poolAddress": "0xb2456a6f51530053bc41b0ee700fe6a2c37282e8",
        "tokens": [
            "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9",
            "0xb19382073c7A0aDdbb56Ac6AF1808Fa49e377B75",
        ],
        "scalingFactors": [1, 1],
        "weights": [500000000000000000, 500000000000000000],
        "swapFee": 0,
        "balancesLiveScaled18": [64604926441576011, 46686842105263157924],
        "tokenRates": [1000000000000000000, 1000000000000000000],
        "totalSupply": 1736721048412749353,
        "lastVirtualBalances": [1000000000000000000, 1000000000000000000],
        "dailyPriceShiftBase": 999999999999999999,
        "lastTimestamp": 1700000000,
        "currentTimestamp": 1700000000,
        "centerednessMargin": 1000,
        "startFourthRootPriceRatio": 1000000000000000000,
        "endFourthRootPriceRatio": 1000000000000000000,
        "priceRatioUpdateStartTime": 1700000000,
        "priceRatioUpdateEndTime": 1700000000,
    }

    pool = ReClamm(pool_state)

    # Test GivenIn swap
    amount_out = pool.on_swap(
        SwapParams(
            swap_kind=SwapKind.GIVENIN,
            balances_live_scaled18=pool_state["balancesLiveScaled18"],
            index_in=0,
            index_out=1,
            amount_given_scaled18=1000000000000000000,
        )
    )
    assert amount_out > 0

    # Test GivenOut swap
    amount_in = pool.on_swap(
        SwapParams(
            swap_kind=SwapKind.GIVENOUT,
            balances_live_scaled18=pool_state["balancesLiveScaled18"],
            index_in=0,
            index_out=1,
            amount_given_scaled18=1000000000000000000,
        )
    )
    assert amount_in > 0

    # Test invariant ratio bounds
    assert pool.get_maximum_invariant_ratio() == 0
    assert pool.get_minimum_invariant_ratio() == 0

from dataclasses import dataclass
from typing import List


@dataclass
class PriceRatioState:
    startFourthRootPriceRatio: int
    endFourthRootPriceRatio: int
    priceRatioUpdateStartTime: int
    priceRatioUpdateEndTime: int


@dataclass
class ReClammMutable:
    lastVirtualBalances: List[int]
    dailyPriceShiftBase: int
    lastTimestamp: int
    currentTimestamp: int
    centerednessMargin: int
    priceRatioState: PriceRatioState

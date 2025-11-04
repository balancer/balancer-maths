use crate::common::types::BasePoolState;
use alloy_primitives::U256;
use serde::{Deserialize, Serialize};

/// ReClamm mutable state
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ReClammMutable {
    #[serde(rename = "lastVirtualBalances")]
    pub last_virtual_balances: Vec<U256>,
    #[serde(rename = "dailyPriceShiftBase")]
    pub daily_price_shift_base: U256,
    #[serde(rename = "lastTimestamp")]
    pub last_timestamp: U256,
    #[serde(rename = "currentTimestamp")]
    pub current_timestamp: U256,
    #[serde(rename = "centerednessMargin")]
    pub centeredness_margin: U256,
    #[serde(rename = "startFourthRootPriceRatio")]
    pub start_fourth_root_price_ratio: U256,
    #[serde(rename = "endFourthRootPriceRatio")]
    pub end_fourth_root_price_ratio: U256,
    #[serde(rename = "priceRatioUpdateStartTime")]
    pub price_ratio_update_start_time: U256,
    #[serde(rename = "priceRatioUpdateEndTime")]
    pub price_ratio_update_end_time: U256,
}

/// ReClamm immutable state
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ReClammImmutable {
    pub pool_address: String,
    pub tokens: Vec<String>,
}

/// ReClamm pool state
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ReClammState {
    pub base: BasePoolState,
    pub mutable: ReClammMutable,
    pub immutable: ReClammImmutable,
}

impl From<ReClammState> for crate::common::types::PoolState {
    fn from(state: ReClammState) -> Self {
        crate::common::types::PoolState::ReClamm(state)
    }
}

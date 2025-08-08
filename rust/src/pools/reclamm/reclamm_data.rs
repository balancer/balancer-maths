use crate::common::types::BasePoolState;
use num_bigint::BigInt;
use serde::{Deserialize, Serialize};

/// ReClamm mutable state
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ReClammMutable {
    #[serde(rename = "lastVirtualBalances")]
    pub last_virtual_balances: Vec<BigInt>,
    #[serde(rename = "dailyPriceShiftBase")]
    pub daily_price_shift_base: BigInt,
    #[serde(rename = "lastTimestamp")]
    pub last_timestamp: BigInt,
    #[serde(rename = "currentTimestamp")]
    pub current_timestamp: BigInt,
    #[serde(rename = "centerednessMargin")]
    pub centeredness_margin: BigInt,
    #[serde(rename = "startFourthRootPriceRatio")]
    pub start_fourth_root_price_ratio: BigInt,
    #[serde(rename = "endFourthRootPriceRatio")]
    pub end_fourth_root_price_ratio: BigInt,
    #[serde(rename = "priceRatioUpdateStartTime")]
    pub price_ratio_update_start_time: BigInt,
    #[serde(rename = "priceRatioUpdateEndTime")]
    pub price_ratio_update_end_time: BigInt,
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

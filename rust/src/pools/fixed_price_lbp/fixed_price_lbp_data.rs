use crate::common::types::BasePoolState;
use alloy_primitives::U256;
use serde::{Deserialize, Serialize};

/// FixedPriceLBP mutable state
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct FixedPriceLBPMutable {
    pub is_swap_enabled: bool,
    pub current_timestamp: U256,
}

/// FixedPriceLBP immutable state
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct FixedPriceLBPImmutable {
    pub project_token_index: usize,
    pub reserve_token_index: usize,
    pub project_token_rate: U256,
    pub start_time: U256,
    pub end_time: U256,
}

/// FixedPriceLBP pool state
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct FixedPriceLBPState {
    pub base: BasePoolState,
    pub mutable: FixedPriceLBPMutable,
    pub immutable: FixedPriceLBPImmutable,
}

impl From<FixedPriceLBPState> for crate::common::types::PoolState {
    fn from(state: FixedPriceLBPState) -> Self {
        crate::common::types::PoolState::FixedPriceLBP(state)
    }
}

use crate::common::types::BasePoolState;
use alloy_primitives::U256;
use serde::{Deserialize, Serialize};

/// Liquidity Bootstrapping mutable state
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct LiquidityBootstrappingMutable {
    pub is_swap_enabled: bool,
    pub current_timestamp: U256,
}

/// Liquidity Bootstrapping immutable state
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct LiquidityBootstrappingImmutable {
    pub project_token_index: usize,
    pub is_project_token_swap_in_blocked: bool,
    pub start_weights: Vec<U256>,
    pub end_weights: Vec<U256>,
    pub start_time: U256,
    pub end_time: U256,
}

/// Liquidity Bootstrapping pool state
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct LiquidityBootstrappingState {
    pub base: BasePoolState,
    pub mutable: LiquidityBootstrappingMutable,
    pub immutable: LiquidityBootstrappingImmutable,
}

impl From<LiquidityBootstrappingState> for crate::common::types::PoolState {
    fn from(state: LiquidityBootstrappingState) -> Self {
        crate::common::types::PoolState::LiquidityBootstrapping(state)
    }
}

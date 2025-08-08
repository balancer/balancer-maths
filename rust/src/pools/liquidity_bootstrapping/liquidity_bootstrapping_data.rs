use crate::common::types::BasePoolState;
use num_bigint::BigInt;
use serde::{Deserialize, Serialize};

/// Liquidity Bootstrapping mutable state
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct LiquidityBootstrappingMutable {
    pub is_swap_enabled: bool,
    pub current_timestamp: BigInt,
}

/// Liquidity Bootstrapping immutable state
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct LiquidityBootstrappingImmutable {
    pub project_token_index: usize,
    pub is_project_token_swap_in_blocked: bool,
    pub start_weights: Vec<BigInt>,
    pub end_weights: Vec<BigInt>,
    pub start_time: BigInt,
    pub end_time: BigInt,
}

/// Liquidity Bootstrapping pool state
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct LiquidityBootstrappingState {
    pub base: BasePoolState,
    pub mutable: LiquidityBootstrappingMutable,
    pub immutable: LiquidityBootstrappingImmutable,
}

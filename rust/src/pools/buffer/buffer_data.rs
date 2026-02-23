use crate::common::types::BasePoolState;
use alloy_primitives::U256;
use serde::{Deserialize, Serialize};

/// Buffer mutable state
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct BufferMutable {
    pub rate: U256,
    pub max_deposit: Option<U256>,
    pub max_mint: Option<U256>,
}

/// Buffer immutable state
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct BufferImmutable {
    pub pool_address: String,
    pub tokens: Vec<String>,
    pub scaling_factor: U256,
}

/// Buffer pool state
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct BufferState {
    pub base: BasePoolState,
    pub mutable: BufferMutable,
    pub immutable: BufferImmutable,
}

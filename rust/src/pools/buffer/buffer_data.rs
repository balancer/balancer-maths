use crate::common::types::BasePoolState;
use num_bigint::BigInt;
use serde::{Deserialize, Serialize};

/// Buffer mutable state
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct BufferMutable {
    pub rate: BigInt,
    pub max_deposit: Option<BigInt>,
    pub max_mint: Option<BigInt>,
}

/// Buffer immutable state
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct BufferImmutable {
    pub pool_address: String,
    pub tokens: Vec<String>,
}

/// Buffer pool state
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct BufferState {
    pub base: BasePoolState,
    pub mutable: BufferMutable,
    pub immutable: BufferImmutable,
} 
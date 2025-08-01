use crate::common::types::BasePoolState;
use num_bigint::BigInt;
use serde::{Deserialize, Serialize};

/// Stable pool mutable state
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct StableMutable {
    pub amp: BigInt,
}

/// Stable pool state
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct StableState {
    #[serde(flatten)]
    pub base: BasePoolState,
    #[serde(flatten)]
    pub mutable: StableMutable,
}

impl From<StableState> for crate::common::types::PoolState {
    fn from(state: StableState) -> Self {
        crate::common::types::PoolState::Stable(state)
    }
} 
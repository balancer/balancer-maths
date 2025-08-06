use crate::common::types::BasePoolState;
use num_bigint::BigInt;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct GyroECLPImmutable {
    pub alpha: BigInt,
    pub beta: BigInt,
    pub c: BigInt,
    pub s: BigInt,
    pub lambda: BigInt,
    pub tau_alpha_x: BigInt,
    pub tau_alpha_y: BigInt,
    pub tau_beta_x: BigInt,
    pub tau_beta_y: BigInt,
    pub u: BigInt,
    pub v: BigInt,
    pub w: BigInt,
    pub z: BigInt,
    pub d_sq: BigInt,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct GyroECLPState {
    #[serde(flatten)]
    pub base: BasePoolState,
    #[serde(flatten)]
    pub immutable: GyroECLPImmutable,
}

impl From<GyroECLPState> for crate::common::types::PoolState {
    fn from(state: GyroECLPState) -> Self {
        crate::common::types::PoolState::GyroECLP(state)
    }
} 
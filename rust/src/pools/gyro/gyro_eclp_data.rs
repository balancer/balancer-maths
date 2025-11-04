use crate::common::types::BasePoolState;
use alloy_primitives::I256;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct GyroECLPImmutable {
    pub alpha: I256,
    pub beta: I256,
    pub c: I256,
    pub s: I256,
    pub lambda: I256,
    pub tau_alpha_x: I256,
    pub tau_alpha_y: I256,
    pub tau_beta_x: I256,
    pub tau_beta_y: I256,
    pub u: I256,
    pub v: I256,
    pub w: I256,
    pub z: I256,
    pub d_sq: I256,
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

//! Weighted pool data structures

use crate::common::types::BasePoolState;
use alloy_primitives::U256;
use serde::{Deserialize, Serialize};

/// Weighted pool state (extends BasePoolState with weighted-specific fields)
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct WeightedState {
    /// Base pool state
    #[serde(flatten)]
    pub base: BasePoolState,
    /// Normalized weights (scaled 18)
    pub weights: Vec<U256>,
}

impl WeightedState {
    /// Create a new weighted pool state
    pub fn new(base: BasePoolState, weights: Vec<U256>) -> Self {
        Self { base, weights }
    }

    /// Get the base pool state
    pub fn base(&self) -> &BasePoolState {
        &self.base
    }

    /// Get the weights
    pub fn weights(&self) -> &[U256] {
        &self.weights
    }
}

impl From<WeightedState> for BasePoolState {
    fn from(weighted_state: WeightedState) -> Self {
        weighted_state.base
    }
}

impl AsRef<BasePoolState> for WeightedState {
    fn as_ref(&self) -> &BasePoolState {
        &self.base
    }
}

impl From<WeightedState> for crate::common::types::PoolState {
    fn from(state: WeightedState) -> Self {
        crate::common::types::PoolState::Weighted(state)
    }
}

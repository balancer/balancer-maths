//! Weighted pool data structures

use num_bigint::BigInt;
use serde::{Deserialize, Serialize};
use crate::common::types::BasePoolState;

/// Weighted pool state (extends BasePoolState with weighted-specific fields)
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct WeightedState {
    /// Base pool state
    #[serde(flatten)]
    pub base: BasePoolState,
    /// Normalized weights (scaled 18)
    pub weights: Vec<BigInt>,
}

impl WeightedState {
    /// Create a new weighted pool state
    pub fn new(base: BasePoolState, weights: Vec<BigInt>) -> Self {
        Self { base, weights }
    }
    
    /// Get the base pool state
    pub fn base(&self) -> &BasePoolState {
        &self.base
    }
    
    /// Get the weights
    pub fn weights(&self) -> &[BigInt] {
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
//! Stable surge hook implementation

use num_bigint::BigInt;
use serde::{Deserialize, Serialize};
use crate::common::types::HookStateBase;
use num_traits::Zero;

/// Stable surge hook state
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct StableSurgeHookState {
    /// Hook type
    pub hook_type: String,
    /// Amplification parameter
    pub amp: BigInt,
    /// Surge threshold percentage (scaled 18)
    pub surge_threshold_percentage: BigInt,
    /// Maximum surge fee percentage (scaled 18)
    pub max_surge_fee_percentage: BigInt,
}

impl HookStateBase for StableSurgeHookState {
    fn hook_type(&self) -> &str {
        &self.hook_type
    }
}

impl Default for StableSurgeHookState {
    fn default() -> Self {
        Self {
            hook_type: "StableSurge".to_string(),
            amp: BigInt::zero(),
            surge_threshold_percentage: BigInt::zero(),
            max_surge_fee_percentage: BigInt::zero(),
        }
    }
} 
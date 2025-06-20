//! Exit fee hook implementation

use num_bigint::BigInt;
use serde::{Deserialize, Serialize};
use crate::common::types::HookStateBase;
use num_traits::Zero;

/// Exit fee hook state
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ExitFeeHookState {
    /// Hook type
    pub hook_type: String,
    /// Token addresses
    pub tokens: Vec<String>,
    /// Remove liquidity hook fee percentage (scaled 18)
    pub remove_liquidity_hook_fee_percentage: BigInt,
}

impl HookStateBase for ExitFeeHookState {
    fn hook_type(&self) -> &str {
        &self.hook_type
    }
}

impl Default for ExitFeeHookState {
    fn default() -> Self {
        Self {
            hook_type: "ExitFee".to_string(),
            tokens: vec![],
            remove_liquidity_hook_fee_percentage: BigInt::zero(),
        }
    }
} 
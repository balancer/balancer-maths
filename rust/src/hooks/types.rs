//! Hook types and state definitions

use num_bigint::BigInt;
use serde::{Deserialize, Serialize};
use crate::common::types::HookStateBase;
use super::exit_fee::ExitFeeHookState;
use super::stable_surge::StableSurgeHookState;

/// Hook state - can be any specific hook type
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(untagged)]
pub enum HookState {
    /// Exit fee hook state
    ExitFee(ExitFeeHookState),
    /// Stable surge hook state
    StableSurge(StableSurgeHookState),
}

impl HookState {
    /// Get the hook type
    pub fn hook_type(&self) -> &str {
        match self {
            HookState::ExitFee(state) => state.hook_type(),
            HookState::StableSurge(state) => state.hook_type(),
        }
    }
}

impl HookStateBase for HookState {
    fn hook_type(&self) -> &str {
        self.hook_type()
    }
} 
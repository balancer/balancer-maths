//! Hook types and state definitions

use super::akron::AkronHookState;
use super::exit_fee::ExitFeeHookState;
use super::stable_surge::StableSurgeHookState;
use crate::common::types::{HookStateBase, SwapKind};
use num_bigint::BigInt;
use serde::{Deserialize, Serialize};

/// Hook state - can be any specific hook type
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(untagged)]
pub enum HookState {
    /// Akron hook state
    Akron(AkronHookState),
    /// Exit fee hook state
    ExitFee(ExitFeeHookState),
    /// Stable surge hook state
    StableSurge(StableSurgeHookState),
}

impl HookState {
    /// Get the hook type
    pub fn hook_type(&self) -> &str {
        match self {
            HookState::Akron(state) => state.hook_type(),
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

/// Parameters for after swap hook
#[derive(Debug, Clone)]
pub struct AfterSwapParams {
    pub kind: SwapKind,
    pub token_in: String,  // IERC20 address
    pub token_out: String, // IERC20 address
    pub amount_in_scaled_18: BigInt,
    pub amount_out_scaled_18: BigInt,
    pub token_in_balance_scaled_18: BigInt,
    pub token_out_balance_scaled_18: BigInt,
    pub amount_calculated_scaled_18: BigInt,
    pub amount_calculated_raw: BigInt,
}

/// Result of dynamic swap fee computation
#[derive(Debug, Clone)]
pub struct DynamicSwapFeeResult {
    pub success: bool,
    pub dynamic_swap_fee: BigInt,
}

/// Result of before swap hook
#[derive(Debug, Clone)]
pub struct BeforeSwapResult {
    pub success: bool,
    pub hook_adjusted_balances_scaled_18: Vec<BigInt>,
}

/// Result of after swap hook
#[derive(Debug, Clone)]
pub struct AfterSwapResult {
    pub success: bool,
    pub hook_adjusted_amount_calculated_raw: BigInt,
}

/// Result of before add liquidity hook
#[derive(Debug, Clone)]
pub struct BeforeAddLiquidityResult {
    pub success: bool,
    pub hook_adjusted_balances_scaled_18: Vec<BigInt>,
}

/// Result of after add liquidity hook
#[derive(Debug, Clone)]
pub struct AfterAddLiquidityResult {
    pub success: bool,
    pub hook_adjusted_amounts_in_raw: Vec<BigInt>,
}

/// Result of before remove liquidity hook
#[derive(Debug, Clone)]
pub struct BeforeRemoveLiquidityResult {
    pub success: bool,
    pub hook_adjusted_balances_scaled_18: Vec<BigInt>,
}

/// Result of after remove liquidity hook
#[derive(Debug, Clone)]
pub struct AfterRemoveLiquidityResult {
    pub success: bool,
    pub hook_adjusted_amounts_out_raw: Vec<BigInt>,
}

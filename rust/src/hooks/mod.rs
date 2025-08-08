//! Hook implementations for Balancer pools

pub mod exit_fee;
pub mod stable_surge;
pub mod types;

use crate::common::types::*;
use num_bigint::BigInt;
use num_traits::Zero;

// Re-export hook-specific types
pub use exit_fee::{ExitFeeHook, ExitFeeHookState};
pub use stable_surge::{StableSurgeHook, StableSurgeHookState};
pub use types::{
    AfterAddLiquidityResult, AfterRemoveLiquidityResult, AfterSwapParams, AfterSwapResult,
    BeforeAddLiquidityResult, BeforeRemoveLiquidityResult, BeforeSwapResult, DynamicSwapFeeResult,
    HookState,
};

/// Hook configuration flags
#[derive(Debug, Clone, PartialEq)]
pub struct HookConfig {
    /// Whether to call compute dynamic swap fee
    pub should_call_compute_dynamic_swap_fee: bool,
    /// Whether to call before swap
    pub should_call_before_swap: bool,
    /// Whether to call after swap
    pub should_call_after_swap: bool,
    /// Whether to call before add liquidity
    pub should_call_before_add_liquidity: bool,
    /// Whether to call after add liquidity
    pub should_call_after_add_liquidity: bool,
    /// Whether to call before remove liquidity
    pub should_call_before_remove_liquidity: bool,
    /// Whether to call after remove liquidity
    pub should_call_after_remove_liquidity: bool,
    /// Whether to enable hook adjusted amounts
    pub enable_hook_adjusted_amounts: bool,
}

impl Default for HookConfig {
    fn default() -> Self {
        Self {
            should_call_compute_dynamic_swap_fee: false,
            should_call_before_swap: false,
            should_call_after_swap: false,
            should_call_before_add_liquidity: false,
            should_call_after_add_liquidity: false,
            should_call_before_remove_liquidity: false,
            should_call_after_remove_liquidity: false,
            enable_hook_adjusted_amounts: false,
        }
    }
}

/// Trait for pool hooks (matches Python HookBase interface exactly)
pub trait HookBase {
    /// Get the hook type
    fn hook_type(&self) -> &str;

    /// Get the hook configuration
    fn config(&self) -> &HookConfig;

    /// Process before add liquidity (matches Python on_before_add_liquidity)
    fn on_before_add_liquidity(
        &self,
        kind: AddLiquidityKind,
        max_amounts_in_scaled_18: &[BigInt],
        min_bpt_amount_out: &BigInt,
        balances_scaled_18: &[BigInt],
        hook_state: &HookState,
    ) -> BeforeAddLiquidityResult;

    /// Process after add liquidity (matches Python on_after_add_liquidity)
    fn on_after_add_liquidity(
        &self,
        kind: AddLiquidityKind,
        amounts_in_scaled_18: &[BigInt],
        amounts_in_raw: &[BigInt],
        bpt_amount_out: &BigInt,
        balances_scaled_18: &[BigInt],
        hook_state: &HookState,
    ) -> AfterAddLiquidityResult;

    /// Process before remove liquidity (matches Python on_before_remove_liquidity)
    fn on_before_remove_liquidity(
        &self,
        kind: RemoveLiquidityKind,
        max_bpt_amount_in: &BigInt,
        min_amounts_out_scaled_18: &[BigInt],
        balances_scaled_18: &[BigInt],
        hook_state: &HookState,
    ) -> BeforeRemoveLiquidityResult;

    /// Process after remove liquidity (matches Python on_after_remove_liquidity)
    fn on_after_remove_liquidity(
        &self,
        kind: RemoveLiquidityKind,
        bpt_amount_in: &BigInt,
        amounts_out_scaled_18: &[BigInt],
        amounts_out_raw: &[BigInt],
        balances_scaled_18: &[BigInt],
        hook_state: &HookState,
    ) -> AfterRemoveLiquidityResult;

    /// Process before swap (matches Python on_before_swap)
    fn on_before_swap(&self, swap_params: &SwapParams, hook_state: &HookState) -> BeforeSwapResult;

    /// Process after swap (matches Python on_after_swap)
    fn on_after_swap(
        &self,
        after_swap_params: &AfterSwapParams,
        hook_state: &HookState,
    ) -> AfterSwapResult;

    /// Compute dynamic swap fee (matches Python on_compute_dynamic_swap_fee)
    fn on_compute_dynamic_swap_fee(
        &self,
        swap_params: &SwapParams,
        static_swap_fee_percentage: &BigInt,
        hook_state: &HookState,
    ) -> DynamicSwapFeeResult;
}

/// Default hook implementation (matches Python DefaultHook)
pub struct DefaultHook {
    config: HookConfig,
}

impl DefaultHook {
    pub fn new() -> Self {
        Self {
            config: HookConfig::default(),
        }
    }
}

impl HookBase for DefaultHook {
    fn hook_type(&self) -> &str {
        "Default"
    }

    fn config(&self) -> &HookConfig {
        &self.config
    }

    fn on_before_add_liquidity(
        &self,
        _kind: AddLiquidityKind,
        _max_amounts_in_scaled_18: &[BigInt],
        _min_bpt_amount_out: &BigInt,
        balances_scaled_18: &[BigInt],
        _hook_state: &HookState,
    ) -> BeforeAddLiquidityResult {
        BeforeAddLiquidityResult {
            success: true,
            hook_adjusted_balances_scaled_18: balances_scaled_18.to_vec(),
        }
    }

    fn on_after_add_liquidity(
        &self,
        _kind: AddLiquidityKind,
        _amounts_in_scaled_18: &[BigInt],
        amounts_in_raw: &[BigInt],
        _bpt_amount_out: &BigInt,
        _balances_scaled_18: &[BigInt],
        _hook_state: &HookState,
    ) -> AfterAddLiquidityResult {
        AfterAddLiquidityResult {
            success: true,
            hook_adjusted_amounts_in_raw: amounts_in_raw.to_vec(),
        }
    }

    fn on_before_remove_liquidity(
        &self,
        _kind: RemoveLiquidityKind,
        _max_bpt_amount_in: &BigInt,
        _min_amounts_out_scaled_18: &[BigInt],
        balances_scaled_18: &[BigInt],
        _hook_state: &HookState,
    ) -> BeforeRemoveLiquidityResult {
        BeforeRemoveLiquidityResult {
            success: true,
            hook_adjusted_balances_scaled_18: balances_scaled_18.to_vec(),
        }
    }

    fn on_after_remove_liquidity(
        &self,
        _kind: RemoveLiquidityKind,
        _bpt_amount_in: &BigInt,
        _amounts_out_scaled_18: &[BigInt],
        amounts_out_raw: &[BigInt],
        _balances_scaled_18: &[BigInt],
        _hook_state: &HookState,
    ) -> AfterRemoveLiquidityResult {
        AfterRemoveLiquidityResult {
            success: true,
            hook_adjusted_amounts_out_raw: amounts_out_raw.to_vec(),
        }
    }

    fn on_before_swap(
        &self,
        _swap_params: &SwapParams,
        _hook_state: &HookState,
    ) -> BeforeSwapResult {
        BeforeSwapResult {
            success: true,
            hook_adjusted_balances_scaled_18: vec![],
        }
    }

    fn on_after_swap(
        &self,
        _after_swap_params: &AfterSwapParams,
        _hook_state: &HookState,
    ) -> AfterSwapResult {
        AfterSwapResult {
            success: true,
            hook_adjusted_amount_calculated_raw: BigInt::zero(),
        }
    }

    fn on_compute_dynamic_swap_fee(
        &self,
        _swap_params: &SwapParams,
        static_swap_fee_percentage: &BigInt,
        _hook_state: &HookState,
    ) -> DynamicSwapFeeResult {
        DynamicSwapFeeResult {
            success: true,
            dynamic_swap_fee: static_swap_fee_percentage.clone(),
        }
    }
}

impl Default for DefaultHook {
    fn default() -> Self {
        DefaultHook::new()
    }
}

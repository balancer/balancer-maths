//! Hook implementations for Balancer pools

pub mod akron;
pub mod directional_fee;
pub mod exit_fee;
pub mod stable_surge;
pub mod types;

pub use akron::{AkronHook, AkronHookState};
pub use directional_fee::{DirectionalFeeHook, DirectionalFeeHookState};
pub use exit_fee::{ExitFeeHook, ExitFeeHookState};
pub use stable_surge::{StableSurgeHook, StableSurgeHookState};

use crate::common::types::{AddLiquidityKind, RemoveLiquidityKind, SwapParams};
use crate::hooks::types::{
    AfterAddLiquidityResult, AfterRemoveLiquidityResult, AfterSwapParams, AfterSwapResult,
    BeforeAddLiquidityResult, BeforeRemoveLiquidityResult, BeforeSwapResult, DynamicSwapFeeResult,
    HookState,
};
use alloy_primitives::U256;

/// Hook configuration flags
#[derive(Debug, Clone, PartialEq, Default)]
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
        max_amounts_in_scaled_18: &[U256],
        min_bpt_amount_out: &U256,
        balances_scaled_18: &[U256],
        hook_state: &HookState,
    ) -> BeforeAddLiquidityResult;

    /// Process after add liquidity (matches Python on_after_add_liquidity)
    fn on_after_add_liquidity(
        &self,
        kind: AddLiquidityKind,
        amounts_in_scaled_18: &[U256],
        amounts_in_raw: &[U256],
        bpt_amount_out: &U256,
        balances_scaled_18: &[U256],
        hook_state: &HookState,
    ) -> AfterAddLiquidityResult;

    /// Process before remove liquidity (matches Python on_before_remove_liquidity)
    fn on_before_remove_liquidity(
        &self,
        kind: RemoveLiquidityKind,
        max_bpt_amount_in: &U256,
        min_amounts_out_scaled_18: &[U256],
        balances_scaled_18: &[U256],
        hook_state: &HookState,
    ) -> BeforeRemoveLiquidityResult;

    /// Process after remove liquidity (matches Python on_after_remove_liquidity)
    fn on_after_remove_liquidity(
        &self,
        kind: RemoveLiquidityKind,
        bpt_amount_in: &U256,
        amounts_out_scaled_18: &[U256],
        amounts_out_raw: &[U256],
        balances_scaled_18: &[U256],
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
        static_swap_fee_percentage: &U256,
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
        _max_amounts_in_scaled_18: &[U256],
        _min_bpt_amount_out: &U256,
        balances_scaled_18: &[U256],
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
        _amounts_in_scaled_18: &[U256],
        amounts_in_raw: &[U256],
        _bpt_amount_out: &U256,
        _balances_scaled_18: &[U256],
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
        _max_bpt_amount_in: &U256,
        _min_amounts_out_scaled_18: &[U256],
        balances_scaled_18: &[U256],
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
        _bpt_amount_in: &U256,
        _amounts_out_scaled_18: &[U256],
        amounts_out_raw: &[U256],
        _balances_scaled_18: &[U256],
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
            hook_adjusted_amount_calculated_raw: U256::ZERO,
        }
    }

    fn on_compute_dynamic_swap_fee(
        &self,
        _swap_params: &SwapParams,
        static_swap_fee_percentage: &U256,
        _hook_state: &HookState,
    ) -> DynamicSwapFeeResult {
        DynamicSwapFeeResult {
            success: true,
            dynamic_swap_fee: *static_swap_fee_percentage,
        }
    }
}

impl Default for DefaultHook {
    fn default() -> Self {
        DefaultHook::new()
    }
}

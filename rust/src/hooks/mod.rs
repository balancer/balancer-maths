//! Hook implementations for Balancer pools

pub mod exit_fee;
pub mod stable_surge;
pub mod types;

use crate::common::types::*;
use crate::common::errors::PoolError;
use num_bigint::BigInt;
use num_traits::Zero;

// Re-export hook-specific types
pub use exit_fee::ExitFeeHookState;
pub use stable_surge::StableSurgeHookState;
pub use types::HookState;

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

/// Trait for pool hooks (matches TypeScript HookBase interface)
pub trait HookBase {
    /// Get the hook type
    fn hook_type(&self) -> &str;
    
    /// Get the hook configuration
    fn config(&self) -> &HookConfig;
    
    /// Process before swap
    fn before_swap(
        &self,
        _swap_input: &SwapInput,
        _pool_state: &PoolState,
        _hook_state: &HookState,
    ) -> Result<(bool, Vec<BigInt>), PoolError> {
        Ok((true, vec![]))
    }
    
    /// Process after swap
    fn after_swap(
        &self,
        _swap_result: &SwapResult,
        _pool_state: &PoolState,
        _hook_state: &HookState,
    ) -> Result<(bool, BigInt), PoolError> {
        Ok((true, BigInt::zero()))
    }
    
    /// Process before add liquidity
    fn before_add_liquidity(
        &self,
        _input: &AddLiquidityInput,
        _pool_state: &PoolState,
        _hook_state: &HookState,
    ) -> Result<(bool, Vec<BigInt>), PoolError> {
        Ok((true, vec![]))
    }
    
    /// Process after add liquidity
    fn after_add_liquidity(
        &self,
        _result: &AddLiquidityResult,
        _pool_state: &PoolState,
        _hook_state: &HookState,
    ) -> Result<(bool, Vec<BigInt>), PoolError> {
        Ok((true, vec![]))
    }
    
    /// Process before remove liquidity
    fn before_remove_liquidity(
        &self,
        _input: &RemoveLiquidityInput,
        _pool_state: &PoolState,
        _hook_state: &HookState,
    ) -> Result<(bool, Vec<BigInt>), PoolError> {
        Ok((true, vec![]))
    }
    
    /// Process after remove liquidity
    fn after_remove_liquidity(
        &self,
        _result: &RemoveLiquidityResult,
        _pool_state: &PoolState,
        _hook_state: &HookState,
    ) -> Result<(bool, Vec<BigInt>), PoolError> {
        Ok((true, vec![]))
    }
    
    /// Compute dynamic swap fee
    fn compute_dynamic_swap_fee(
        &self,
        _swap_input: &SwapInput,
        _pool_state: &PoolState,
        _static_swap_fee: &BigInt,
        _hook_state: &HookState,
    ) -> Result<(bool, BigInt), PoolError> {
        Ok((true, BigInt::zero()))
    }
}

/// Default hook implementation (matches TypeScript DefaultHook)
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
}

impl Default for DefaultHook {
    fn default() -> Self {
        DefaultHook::new()
    }
} 
//! Vault operations for Balancer pools

pub mod add_liquidity;
pub mod base_pool_math;
pub mod remove_liquidity;
pub mod swap;

use crate::common::errors::PoolError;
use crate::common::pool_base::PoolBase;
use crate::common::types::*;
use crate::hooks::types::HookState;
use crate::hooks::{DefaultHook, HookBase};
use crate::vault::add_liquidity::add_liquidity;
use crate::vault::remove_liquidity::remove_liquidity;
use crate::vault::swap::swap;
use num_bigint::BigInt;

/// Main vault interface for pool operations
pub struct Vault;

impl Vault {
    /// Create a new vault instance
    pub fn new() -> Self {
        Vault
    }

    /// Perform a swap operation
    pub fn swap(
        &self,
        swap_input: &SwapInput,
        pool_state: &PoolState,
        hook_state: Option<&HookState>,
    ) -> Result<BigInt, PoolError> {
        let base_state = pool_state.base();

        // Create pool instance
        let pool: Box<dyn PoolBase> = match pool_state {
            PoolState::Weighted(weighted_state) => {
                // Use the weights from the WeightedState directly
                Box::new(crate::pools::weighted::WeightedPool::from(
                    weighted_state.clone(),
                ))
            }
            PoolState::Stable(stable_state) => {
                Box::new(crate::pools::stable::StablePool::new(stable_state.mutable.clone()))
            }
            _ => return Err(PoolError::UnsupportedPoolType(base_state.pool_type.clone())),
        };

        // Create hook instance
        let hook: Box<dyn HookBase> = Box::new(DefaultHook::new());

        swap(
            swap_input,
            pool_state,
            pool.as_ref(),
            hook.as_ref(),
            hook_state,
        )
    }

    /// Add liquidity to a pool
    pub fn add_liquidity(
        &self,
        add_liquidity_input: &AddLiquidityInput,
        pool_state: &PoolState,
        hook_state: Option<&HookState>,
    ) -> Result<AddLiquidityResult, PoolError> {
        let base_state = pool_state.base();

        // Create pool instance
        let pool: Box<dyn PoolBase> = match pool_state {
            PoolState::Weighted(weighted_state) => {
                // Use the weights from the WeightedState directly
                Box::new(crate::pools::weighted::WeightedPool::from(
                    weighted_state.clone(),
                ))
            }
            PoolState::Stable(stable_state) => {
                Box::new(crate::pools::stable::StablePool::new(stable_state.mutable.clone()))
            }
            _ => return Err(PoolError::UnsupportedPoolType(base_state.pool_type.clone())),
        };

        // Create hook instance
        let hook: Box<dyn HookBase> = Box::new(DefaultHook::new());

        add_liquidity(
            add_liquidity_input,
            pool_state,
            pool.as_ref(),
            hook.as_ref(),
            hook_state,
        )
    }

    /// Remove liquidity from a pool
    pub fn remove_liquidity(
        &self,
        remove_liquidity_input: &RemoveLiquidityInput,
        pool_state: &PoolState,
        hook_state: Option<&HookState>,
    ) -> Result<RemoveLiquidityResult, PoolError> {
        let base_state = pool_state.base();

        // Create pool instance
        let pool: Box<dyn PoolBase> = match pool_state {
            PoolState::Weighted(weighted_state) => {
                // Use the weights from the WeightedState directly
                Box::new(crate::pools::weighted::WeightedPool::from(
                    weighted_state.clone(),
                ))
            }
            PoolState::Stable(stable_state) => {
                Box::new(crate::pools::stable::StablePool::new(stable_state.mutable.clone()))
            }
            _ => return Err(PoolError::UnsupportedPoolType(base_state.pool_type.clone())),
        };

        // Create hook instance
        let hook: Box<dyn HookBase> = Box::new(DefaultHook::new());

        remove_liquidity(
            remove_liquidity_input,
            pool_state,
            pool.as_ref(),
            hook.as_ref(),
            hook_state,
        )
    }
}

impl Default for Vault {
    fn default() -> Self {
        Vault::new()
    }
}

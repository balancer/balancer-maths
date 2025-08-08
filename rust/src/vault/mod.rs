//! Vault operations for Balancer pools

pub mod add_liquidity;
pub mod base_pool_math;
pub mod remove_liquidity;
pub mod swap;

use crate::common::errors::PoolError;
use crate::common::pool_base::PoolBase;
use crate::common::types::*;
use crate::hooks::types::HookState;
use crate::hooks::{DefaultHook, HookBase, StableSurgeHook, ExitFeeHook};
use crate::pools::buffer::erc4626_buffer_wrap_or_unwrap;
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

    /// Get hook instance based on hook type
    fn get_hook(&self, hook_type: &Option<String>, hook_state: Option<&HookState>) -> Box<dyn HookBase> {
        match hook_type {
            Some(hook_type) => {
                match hook_type.as_str() {
                    "StableSurge" => {
                        // Validate that hook state is provided and matches the type
                        if let Some(HookState::StableSurge(_)) = hook_state {
                            Box::new(StableSurgeHook::new())
                        } else {
                            // Fall back to default hook if state doesn't match
                            Box::new(DefaultHook::new())
                        }
                    }
                    "ExitFee" => {
                        // Validate that hook state is provided and matches the type
                        if let Some(HookState::ExitFee(_)) = hook_state {
                            Box::new(ExitFeeHook::new())
                        } else {
                            // Fall back to default hook if state doesn't match
                            Box::new(DefaultHook::new())
                        }
                    }
                    _ => {
                        // Unknown hook type, use default hook
                        Box::new(DefaultHook::new())
                    }
                }
            }
            None => {
                // No hook type specified, use default hook
                Box::new(DefaultHook::new())
            }
        }
    }

    /// Perform a swap operation
    pub fn swap(
        &self,
        swap_input: &SwapInput,
        pool_state_or_buffer: &PoolStateOrBuffer,
        hook_state: Option<&HookState>,
    ) -> Result<BigInt, PoolError> {
        match pool_state_or_buffer {
            PoolStateOrBuffer::Pool(pool_state) => {
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
                    PoolState::GyroECLP(gyro_eclp_state) => {
                        Box::new(crate::pools::gyro::GyroECLPPool::new(gyro_eclp_state.immutable.clone()))
                    }
                    PoolState::QuantAmm(quant_amm_state) => {
                        Box::new(crate::pools::quantamm::QuantAmmPool::from(quant_amm_state.clone()))
                    }
                    PoolState::LiquidityBootstrapping(liquidity_bootstrapping_state) => {
                        Box::new(crate::pools::liquidity_bootstrapping::LiquidityBootstrappingPool::from(liquidity_bootstrapping_state.clone()))
                    }
                    PoolState::ReClamm(re_clamm_state) => {
                        Box::new(crate::pools::reclamm::ReClammPool::new(re_clamm_state.clone()))
                    }
                    _ => return Err(PoolError::UnsupportedPoolType(base_state.pool_type.clone())),
                };

                // Create hook instance
                let hook: Box<dyn HookBase> = self.get_hook(&base_state.hook_type, hook_state);

                swap(
                    swap_input,
                    pool_state,
                    pool.as_ref(),
                    hook.as_ref(),
                    hook_state,
                )
            }
            PoolStateOrBuffer::Buffer(buffer_state) => {
                erc4626_buffer_wrap_or_unwrap(swap_input, buffer_state)
                    .map_err(|_| PoolError::InvalidSwapParameters)
            }
        }
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
            PoolState::GyroECLP(gyro_eclp_state) => {
                Box::new(crate::pools::gyro::GyroECLPPool::new(gyro_eclp_state.immutable.clone()))
            }
            PoolState::QuantAmm(quant_amm_state) => {
                Box::new(crate::pools::quantamm::QuantAmmPool::from(quant_amm_state.clone()))
            }
            PoolState::LiquidityBootstrapping(liquidity_bootstrapping_state) => {
                Box::new(crate::pools::liquidity_bootstrapping::LiquidityBootstrappingPool::from(liquidity_bootstrapping_state.clone()))
            }
            _ => return Err(PoolError::UnsupportedPoolType(base_state.pool_type.clone())),
        };

        // Create hook instance
        let hook: Box<dyn HookBase> = self.get_hook(&base_state.hook_type, hook_state);

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
            PoolState::GyroECLP(gyro_eclp_state) => {
                Box::new(crate::pools::gyro::GyroECLPPool::new(gyro_eclp_state.immutable.clone()))
            }
            PoolState::QuantAmm(quant_amm_state) => {
                Box::new(crate::pools::quantamm::QuantAmmPool::from(quant_amm_state.clone()))
            }
            PoolState::LiquidityBootstrapping(liquidity_bootstrapping_state) => {
                Box::new(crate::pools::liquidity_bootstrapping::LiquidityBootstrappingPool::from(liquidity_bootstrapping_state.clone()))
            }
            PoolState::ReClamm(re_clamm_state) => {
                Box::new(crate::pools::reclamm::ReClammPool::new(re_clamm_state.clone()))
            }
            _ => return Err(PoolError::UnsupportedPoolType(base_state.pool_type.clone())),
        };

        // Create hook instance
        let hook: Box<dyn HookBase> = self.get_hook(&base_state.hook_type, hook_state);

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

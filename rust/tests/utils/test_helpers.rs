//! Shared test helper functions for pool state conversion and utilities

use crate::utils::read_test_data::SupportedPool;
use balancer_maths_rust::common::types::{PoolState, PoolStateOrBuffer};
use balancer_maths_rust::pools::buffer::{BufferImmutable, BufferMutable, BufferState};
use balancer_maths_rust::pools::gyro::{GyroECLPImmutable, GyroECLPState};
use balancer_maths_rust::pools::liquidity_bootstrapping::{
    LiquidityBootstrappingImmutable, LiquidityBootstrappingMutable, LiquidityBootstrappingState,
};
use balancer_maths_rust::pools::quantamm::{QuantAmmImmutable, QuantAmmMutable, QuantAmmState};
use balancer_maths_rust::pools::reclamm::{ReClammImmutable, ReClammMutable, ReClammState};
use balancer_maths_rust::pools::stable::{StableMutable, StableState};
use balancer_maths_rust::pools::weighted::WeightedState;

/// Convert a SupportedPool from test data to a PoolStateOrBuffer for the vault
/// Returns PoolState for normal pools and BufferState for Buffer pools
pub fn convert_to_pool_state(pool: &SupportedPool) -> PoolStateOrBuffer {
    match pool {
        SupportedPool::Weighted(weighted_pool) => {
            let weighted_state = WeightedState {
                base: weighted_pool.state.base.clone(),
                weights: weighted_pool.state.weights.clone(),
            };
            PoolStateOrBuffer::Pool(Box::new(PoolState::Weighted(weighted_state)))
        }
        SupportedPool::Stable(stable_pool) => {
            let stable_state = StableState {
                base: stable_pool.state.base.clone(),
                mutable: StableMutable {
                    amp: stable_pool.state.mutable.amp.clone(),
                },
            };
            PoolStateOrBuffer::Pool(Box::new(PoolState::Stable(stable_state)))
        }
        SupportedPool::GyroECLP(gyro_eclp_pool) => {
            let gyro_eclp_state = GyroECLPState {
                base: gyro_eclp_pool.state.base.clone(),
                immutable: GyroECLPImmutable {
                    alpha: gyro_eclp_pool.state.immutable.alpha.clone(),
                    beta: gyro_eclp_pool.state.immutable.beta.clone(),
                    c: gyro_eclp_pool.state.immutable.c.clone(),
                    s: gyro_eclp_pool.state.immutable.s.clone(),
                    lambda: gyro_eclp_pool.state.immutable.lambda.clone(),
                    tau_alpha_x: gyro_eclp_pool.state.immutable.tau_alpha_x.clone(),
                    tau_alpha_y: gyro_eclp_pool.state.immutable.tau_alpha_y.clone(),
                    tau_beta_x: gyro_eclp_pool.state.immutable.tau_beta_x.clone(),
                    tau_beta_y: gyro_eclp_pool.state.immutable.tau_beta_y.clone(),
                    u: gyro_eclp_pool.state.immutable.u.clone(),
                    v: gyro_eclp_pool.state.immutable.v.clone(),
                    w: gyro_eclp_pool.state.immutable.w.clone(),
                    z: gyro_eclp_pool.state.immutable.z.clone(),
                    d_sq: gyro_eclp_pool.state.immutable.d_sq.clone(),
                },
            };
            PoolStateOrBuffer::Pool(Box::new(PoolState::GyroECLP(gyro_eclp_state)))
        }
        SupportedPool::QuantAmm(quant_amm_pool) => {
            let quant_amm_state = QuantAmmState {
                base: quant_amm_pool.state.base.clone(),
                mutable: QuantAmmMutable {
                    first_four_weights_and_multipliers: quant_amm_pool
                        .state
                        .mutable
                        .first_four_weights_and_multipliers
                        .clone(),
                    second_four_weights_and_multipliers: quant_amm_pool
                        .state
                        .mutable
                        .second_four_weights_and_multipliers
                        .clone(),
                    last_update_time: quant_amm_pool.state.mutable.last_update_time.clone(),
                    last_interop_time: quant_amm_pool.state.mutable.last_interop_time.clone(),
                    current_timestamp: quant_amm_pool.state.mutable.current_timestamp.clone(),
                },
                immutable: QuantAmmImmutable {
                    max_trade_size_ratio: quant_amm_pool
                        .state
                        .immutable
                        .max_trade_size_ratio
                        .clone(),
                },
            };
            PoolStateOrBuffer::Pool(Box::new(PoolState::QuantAmm(quant_amm_state)))
        }
        SupportedPool::LiquidityBootstrapping(liquidity_bootstrapping_pool) => {
            let liquidity_bootstrapping_state = LiquidityBootstrappingState {
                base: liquidity_bootstrapping_pool.state.base.clone(),
                mutable: LiquidityBootstrappingMutable {
                    is_swap_enabled: liquidity_bootstrapping_pool.state.mutable.is_swap_enabled,
                    current_timestamp: liquidity_bootstrapping_pool
                        .state
                        .mutable
                        .current_timestamp
                        .clone(),
                },
                immutable: LiquidityBootstrappingImmutable {
                    project_token_index: liquidity_bootstrapping_pool
                        .state
                        .immutable
                        .project_token_index,
                    is_project_token_swap_in_blocked: liquidity_bootstrapping_pool
                        .state
                        .immutable
                        .is_project_token_swap_in_blocked,
                    start_weights: liquidity_bootstrapping_pool
                        .state
                        .immutable
                        .start_weights
                        .clone(),
                    end_weights: liquidity_bootstrapping_pool
                        .state
                        .immutable
                        .end_weights
                        .clone(),
                    start_time: liquidity_bootstrapping_pool
                        .state
                        .immutable
                        .start_time
                        .clone(),
                    end_time: liquidity_bootstrapping_pool
                        .state
                        .immutable
                        .end_time
                        .clone(),
                },
            };
            PoolStateOrBuffer::Pool(Box::new(PoolState::LiquidityBootstrapping(
                liquidity_bootstrapping_state,
            )))
        }
        SupportedPool::ReClamm(re_clamm_pool) => {
            let re_clamm_state = ReClammState {
                base: re_clamm_pool.state.base.clone(),
                mutable: ReClammMutable {
                    last_virtual_balances: re_clamm_pool
                        .state
                        .mutable
                        .last_virtual_balances
                        .clone(),
                    daily_price_shift_base: re_clamm_pool
                        .state
                        .mutable
                        .daily_price_shift_base
                        .clone(),
                    last_timestamp: re_clamm_pool.state.mutable.last_timestamp.clone(),
                    current_timestamp: re_clamm_pool.state.mutable.current_timestamp.clone(),
                    centeredness_margin: re_clamm_pool.state.mutable.centeredness_margin.clone(),
                    start_fourth_root_price_ratio: re_clamm_pool
                        .state
                        .mutable
                        .start_fourth_root_price_ratio
                        .clone(),
                    end_fourth_root_price_ratio: re_clamm_pool
                        .state
                        .mutable
                        .end_fourth_root_price_ratio
                        .clone(),
                    price_ratio_update_start_time: re_clamm_pool
                        .state
                        .mutable
                        .price_ratio_update_start_time
                        .clone(),
                    price_ratio_update_end_time: re_clamm_pool
                        .state
                        .mutable
                        .price_ratio_update_end_time
                        .clone(),
                },
                immutable: ReClammImmutable {
                    pool_address: re_clamm_pool.state.immutable.pool_address.clone(),
                    tokens: re_clamm_pool.state.immutable.tokens.clone(),
                },
            };
            PoolStateOrBuffer::Pool(Box::new(PoolState::ReClamm(re_clamm_state)))
        }
        SupportedPool::Buffer(buffer_pool) => {
            let buffer_state = BufferState {
                base: buffer_pool.state.base.clone(),
                mutable: BufferMutable {
                    rate: buffer_pool.state.mutable.rate.clone(),
                    max_deposit: buffer_pool.state.mutable.max_deposit.clone(),
                    max_mint: buffer_pool.state.mutable.max_mint.clone(),
                },
                immutable: BufferImmutable {
                    pool_address: buffer_pool.state.immutable.pool_address.clone(),
                    tokens: buffer_pool.state.immutable.tokens.clone(),
                },
            };
            PoolStateOrBuffer::Buffer(Box::new(buffer_state))
        } // Add other pool types here as they are implemented
    }
}

/// Get the pool address from a SupportedPool
#[allow(dead_code)]
pub fn get_pool_address(pool: &SupportedPool) -> String {
    match pool {
        SupportedPool::Weighted(weighted_pool) => weighted_pool.base.pool_address.clone(),
        SupportedPool::Stable(stable_pool) => stable_pool.base.pool_address.clone(),
        SupportedPool::GyroECLP(gyro_eclp_pool) => gyro_eclp_pool.base.pool_address.clone(),
        SupportedPool::QuantAmm(quant_amm_pool) => quant_amm_pool.base.pool_address.clone(),
        SupportedPool::LiquidityBootstrapping(liquidity_bootstrapping_pool) => {
            liquidity_bootstrapping_pool.base.pool_address.clone()
        }
        SupportedPool::ReClamm(re_clamm_pool) => re_clamm_pool.base.pool_address.clone(),
        SupportedPool::Buffer(buffer_pool) => buffer_pool.base.pool_address.clone(),
        // Add other pool types here as they are implemented
    }
}

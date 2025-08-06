use balancer_maths_rust::common::types::*;
use balancer_maths_rust::vault::Vault;
use balancer_maths_rust::pools::stable::{StableState, StableMutable};
use balancer_maths_rust::pools::gyro::{GyroECLPState, GyroECLPImmutable};
use balancer_maths_rust::pools::quantamm::{QuantAmmState, QuantAmmMutable, QuantAmmImmutable};
use balancer_maths_rust::pools::liquidity_bootstrapping::{LiquidityBootstrappingState, LiquidityBootstrappingMutable, LiquidityBootstrappingImmutable};
mod utils;
use utils::read_test_data;
use utils::SupportedPool;

/// Convert SupportedPool to PoolState
fn convert_to_pool_state(pool: &SupportedPool) -> PoolState {
    match pool {
        SupportedPool::Weighted(weighted_pool) => PoolState::Weighted(weighted_pool.state.clone()),
        SupportedPool::Stable(stable_pool) => {
            let stable_state = StableState {
                base: stable_pool.state.base.clone(),
                mutable: StableMutable {
                    amp: stable_pool.state.mutable.amp.clone(),
                },
            };
            PoolState::Stable(stable_state)
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
            PoolState::GyroECLP(gyro_eclp_state)
        }
        SupportedPool::QuantAmm(quant_amm_pool) => {
            let quant_amm_state = QuantAmmState {
                base: quant_amm_pool.state.base.clone(),
                mutable: QuantAmmMutable {
                    first_four_weights_and_multipliers: quant_amm_pool.state.mutable.first_four_weights_and_multipliers.clone(),
                    second_four_weights_and_multipliers: quant_amm_pool.state.mutable.second_four_weights_and_multipliers.clone(),
                    last_update_time: quant_amm_pool.state.mutable.last_update_time.clone(),
                    last_interop_time: quant_amm_pool.state.mutable.last_interop_time.clone(),
                    current_timestamp: quant_amm_pool.state.mutable.current_timestamp.clone(),
                },
                immutable: QuantAmmImmutable {
                    max_trade_size_ratio: quant_amm_pool.state.immutable.max_trade_size_ratio.clone(),
                },
            };
            PoolState::QuantAmm(quant_amm_state)
        }
        SupportedPool::LiquidityBootstrapping(liquidity_bootstrapping_pool) => {
            let liquidity_bootstrapping_state = LiquidityBootstrappingState {
                base: liquidity_bootstrapping_pool.state.base.clone(),
                mutable: LiquidityBootstrappingMutable {
                    is_swap_enabled: liquidity_bootstrapping_pool.state.mutable.is_swap_enabled,
                    current_timestamp: liquidity_bootstrapping_pool.state.mutable.current_timestamp.clone(),
                },
                immutable: LiquidityBootstrappingImmutable {
                    project_token_index: liquidity_bootstrapping_pool.state.immutable.project_token_index,
                    is_project_token_swap_in_blocked: liquidity_bootstrapping_pool.state.immutable.is_project_token_swap_in_blocked,
                    start_weights: liquidity_bootstrapping_pool.state.immutable.start_weights.clone(),
                    end_weights: liquidity_bootstrapping_pool.state.immutable.end_weights.clone(),
                    start_time: liquidity_bootstrapping_pool.state.immutable.start_time.clone(),
                    end_time: liquidity_bootstrapping_pool.state.immutable.end_time.clone(),
                },
            };
            PoolState::LiquidityBootstrapping(liquidity_bootstrapping_state)
        }
        // Add other pool types here as they are implemented
    }
}

/// Get pool address from SupportedPool
fn get_pool_address(pool: &SupportedPool) -> String {
    match pool {
        SupportedPool::Weighted(weighted_pool) => weighted_pool.base.pool_address.clone(),
        SupportedPool::Stable(stable_pool) => stable_pool.base.pool_address.clone(),
        SupportedPool::GyroECLP(gyro_eclp_pool) => gyro_eclp_pool.base.pool_address.clone(),
        SupportedPool::QuantAmm(quant_amm_pool) => quant_amm_pool.base.pool_address.clone(),
        SupportedPool::LiquidityBootstrapping(liquidity_bootstrapping_pool) => liquidity_bootstrapping_pool.base.pool_address.clone(),
        // Add other pool types here as they are implemented
    }
}

#[test]
fn test_remove_liquidity() {
    let test_data = read_test_data().expect("Failed to read test data");
    let vault = Vault::new();

    for remove_test in test_data.removes {
        println!("Remove Liquidity Test: {}", remove_test.test);
        
        // Get the pool data for this test
        let pool_data = test_data.pools.get(&remove_test.test)
            .expect(&format!("Pool not found for test: {}", remove_test.test));
        
        // Convert pool data to PoolState
        let pool_state = convert_to_pool_state(pool_data);

        // Create RemoveLiquidityInput
        let remove_liquidity_input = RemoveLiquidityInput {
            pool: get_pool_address(pool_data),
            min_amounts_out_raw: remove_test.amounts_out_raw.clone(),
            max_bpt_amount_in_raw: remove_test.bpt_in_raw.clone(),
            kind: match remove_test.kind {
                0 => RemoveLiquidityKind::Proportional,
                1 => RemoveLiquidityKind::SingleTokenExactIn,
                2 => RemoveLiquidityKind::SingleTokenExactOut,
                _ => panic!("Unsupported remove kind: {}", remove_test.kind),
            },
        };

        // Perform remove liquidity operation
        let result = vault.remove_liquidity(
            &remove_liquidity_input,
            &pool_state,
            None, // No hook state for now
        ).expect("Remove liquidity failed");

        // Verify the results match expected values
        assert_eq!(result.bpt_amount_in_raw, remove_test.bpt_in_raw);
        assert_eq!(result.amounts_out_raw, remove_test.amounts_out_raw);
    }
}
use balancer_maths_rust::common::types::*;
use balancer_maths_rust::vault::Vault;
use balancer_maths_rust::pools::stable::{StableState, StableMutable};
use balancer_maths_rust::pools::gyro::{GyroECLPState, GyroECLPImmutable};
use balancer_maths_rust::pools::quantamm::{QuantAmmState, QuantAmmMutable, QuantAmmImmutable};
use num_bigint::BigInt;
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
        // Add other pool types here as they are implemented
    }
}

/// Check if two BigInts are within a percentage tolerance (for Buffer pools)
fn are_big_ints_within_percent(value1: &BigInt, value2: &BigInt, percent: f64) -> bool {
    if percent < 0.0 {
        panic!("Percent must be non-negative");
    }

    let difference = if value1 > value2 {
        value1 - value2
    } else {
        value2 - value1
    };

    // Convert percent to basis points (1% = 100 basis points) multiplied by 1e6
    // This maintains precision similar to the TypeScript version
    let percent_factor = (percent * 1e8) as i64;
    let tolerance = (value2 * BigInt::from(percent_factor)) / BigInt::from(10000000000i64);

    difference <= tolerance
}

#[test]
fn test_swaps() {
    let test_data = read_test_data().expect("Failed to read test data");
    let vault = Vault::new();

    for swap_test in test_data.swaps {
        println!("Swap Test: {}", swap_test.test);
        
        // Get the pool data for this test
        let pool_data = test_data.pools.get(&swap_test.test)
            .expect(&format!("Pool not found for test: {}", swap_test.test));
        
        // Convert pool data to PoolState
        let pool_state = convert_to_pool_state(pool_data);

        // Create SwapInput
        let swap_input = SwapInput {
            amount_raw: swap_test.amount_raw.clone(),
            token_in: swap_test.token_in.clone(),
            token_out: swap_test.token_out.clone(),
            swap_kind: match swap_test.swap_kind {
                0 => SwapKind::GivenIn,
                1 => SwapKind::GivenOut,
                _ => panic!("Unsupported swap kind: {}", swap_test.swap_kind),
            },
        };

        // Perform swap operation
        let result = vault.swap(
            &swap_input,
            &pool_state,
            None, // No hook state for now
        ).expect("Swap failed");



        // Check if this is a Buffer pool (which has tolerance)
        if pool_state.base().pool_type == "Buffer" {
            assert!(
                are_big_ints_within_percent(&result, &swap_test.output_raw, 0.001),
                "Buffer pool swap result outside tolerance for test: {}",
                swap_test.test
            );
        } else {
            assert_eq!(
                result, swap_test.output_raw,
                "Swap result mismatch for test: {}",
                swap_test.test
            );
        }
    }
}

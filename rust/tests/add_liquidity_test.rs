use balancer_maths_rust::common::types::*;
use balancer_maths_rust::vault::Vault;
use balancer_maths_rust::pools::stable::{StableState, StableMutable};
use balancer_maths_rust::pools::gyro::{GyroECLPState, GyroECLPImmutable};
use balancer_maths_rust::pools::quantamm::{QuantAmmState, QuantAmmMutable, QuantAmmImmutable};
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

#[test]
fn test_add_liquidity() {
    let test_data = read_test_data().expect("Failed to read test data");
    let vault = Vault::new();

    for add in test_data.adds {
        println!("Testing add liquidity: {} (kind: {})", add.test, add.kind);

        // Get the pool data for this test
        let pool = test_data
            .pools
            .get(&add.test)
            .expect(&format!("No pool data found for test: {}", add.test));

        // Convert pool to PoolState
        let pool_state = convert_to_pool_state(pool);

        // Convert kind to AddLiquidityKind
        let kind = match add.kind {
            0 => AddLiquidityKind::Unbalanced,
            1 => AddLiquidityKind::SingleTokenExactOut,
            _ => panic!("Unsupported add kind: {}", add.kind),
        };

        // Create add liquidity input
        let add_input = AddLiquidityInput {
            pool: get_pool_address(pool),
            max_amounts_in_raw: add.input_amounts_raw.clone(),
            min_bpt_amount_out_raw: add.bpt_out_raw.clone(),
            kind,
        };

        // Perform add liquidity
        match vault.add_liquidity(&add_input, &pool_state, None) {
            Ok(calculated_amounts) => {
                assert_eq!(
                    calculated_amounts.bpt_amount_out_raw, add.bpt_out_raw,
                    "BPT amount out mismatch for test: {}",
                    add.test
                );
                assert_eq!(
                    calculated_amounts.amounts_in_raw, add.input_amounts_raw,
                    "Amounts in mismatch for test: {}",
                    add.test
                );
                println!("✓ Test passed: {} (kind: {})", add.test, add.kind);
            }
            Err(e) => {
                panic!("Add liquidity failed for test {}: {:?}", add.test, e);
            }
        }
    }
}

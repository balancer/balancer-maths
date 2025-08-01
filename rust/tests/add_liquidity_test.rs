use balancer_maths_rust::common::types::*;
use balancer_maths_rust::vault::Vault;
use balancer_maths_rust::pools::stable::{StableState, StableMutable};
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
        // Add other pool types here as they are implemented
    }
}

/// Get pool address from SupportedPool
fn get_pool_address(pool: &SupportedPool) -> String {
    match pool {
        SupportedPool::Weighted(weighted_pool) => weighted_pool.base.pool_address.clone(),
        SupportedPool::Stable(stable_pool) => stable_pool.base.pool_address.clone(),
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

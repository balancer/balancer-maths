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
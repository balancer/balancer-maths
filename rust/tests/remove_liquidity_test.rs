use balancer_maths_rust::common::types::*;
use balancer_maths_rust::vault::Vault;
mod utils;
use utils::read_test_data;
use utils::SupportedPool;

/// Convert SupportedPool to PoolState
fn convert_to_pool_state(pool: &SupportedPool) -> PoolState {
    match pool {
        SupportedPool::Weighted(weighted_pool) => PoolState::Weighted(weighted_pool.state.clone()),
        // Add other pool types here as they are implemented
    }
}

/// Get pool address from SupportedPool
fn get_pool_address(pool: &SupportedPool) -> String {
    match pool {
        SupportedPool::Weighted(weighted_pool) => weighted_pool.base.pool_address.clone(),
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

#[test]
fn test_remove_liquidity_weighted_pool_specific() {
    let test_data = read_test_data().expect("Failed to read test data");
    let vault = Vault::new();

    // Find weighted pool tests specifically
    for remove_test in test_data.removes {
        if let Some(pool_data) = test_data.pools.get(&remove_test.test) {
            match pool_data {
                SupportedPool::Weighted(_) => {
                println!("Weighted Pool Remove Liquidity Test: {}", remove_test.test);
                
                let pool_state = convert_to_pool_state(pool_data);

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

                let result = vault.remove_liquidity(
                    &remove_liquidity_input,
                    &pool_state,
                    None,
                ).expect("Remove liquidity failed");

                assert_eq!(result.bpt_amount_in_raw, remove_test.bpt_in_raw);
                assert_eq!(result.amounts_out_raw, remove_test.amounts_out_raw);
                }
                _ => {} // Skip other pool types for now
            }
        }
    }
} 
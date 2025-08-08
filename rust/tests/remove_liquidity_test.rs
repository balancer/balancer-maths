use balancer_maths_rust::common::types::PoolStateOrBuffer;
use balancer_maths_rust::common::types::*;
use balancer_maths_rust::vault::Vault;
mod utils;
use utils::read_test_data;
use utils::{convert_to_pool_state, get_pool_address};

#[test]
fn test_remove_liquidity() {
    let test_data = read_test_data().expect("Failed to read test data");
    let vault = Vault::new();

    for remove_test in test_data.removes {
        println!("Remove Liquidity Test: {}", remove_test.test);

        // Get the pool data for this test
        let pool_data = test_data
            .pools
            .get(&remove_test.test)
            .unwrap_or_else(|| panic!("Pool not found for test: {}", remove_test.test));

        // Convert pool data to PoolStateOrBuffer
        let pool_state_or_buffer = convert_to_pool_state(pool_data);

        // Skip Buffer pools as they don't support remove_liquidity
        let pool_state = match pool_state_or_buffer {
            PoolStateOrBuffer::Pool(pool_state) => pool_state,
            PoolStateOrBuffer::Buffer(_) => {
                println!(
                    "Skipping Buffer pool for remove liquidity test: {}",
                    remove_test.test
                );
                continue;
            }
        };

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
        let result = vault
            .remove_liquidity(
                &remove_liquidity_input,
                &pool_state,
                None, // No hook state for now
            )
            .expect("Remove liquidity failed");

        // Verify the results match expected values
        assert_eq!(result.bpt_amount_in_raw, remove_test.bpt_in_raw);
        assert_eq!(result.amounts_out_raw, remove_test.amounts_out_raw);
    }
}

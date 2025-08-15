use balancer_maths_rust::common::types::PoolStateOrBuffer;
use balancer_maths_rust::common::types::*;
use balancer_maths_rust::vault::Vault;
mod utils;
use utils::read_test_data;
use utils::{convert_to_pool_state, get_pool_address};

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
            .unwrap_or_else(|| panic!("No pool data found for test: {}", add.test));

        // Convert pool to PoolStateOrBuffer
        let pool_state_or_buffer = convert_to_pool_state(pool);

        // Skip Buffer pools as they don't support add_liquidity
        let pool_state = match &pool_state_or_buffer {
            PoolStateOrBuffer::Pool(pool_state) => pool_state.as_ref(),
            PoolStateOrBuffer::Buffer(_) => {
                println!("Skipping Buffer pool for add liquidity test: {}", add.test);
                continue;
            }
        };

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

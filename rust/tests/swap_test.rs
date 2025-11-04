use alloy_primitives::U256;
use balancer_maths_rust::common::types::PoolStateOrBuffer;
use balancer_maths_rust::common::types::*;
use balancer_maths_rust::vault::Vault;
mod utils;
use utils::convert_to_pool_state;
use utils::read_test_data;

/// Check if two U256s are within a percentage tolerance (for Buffer pools)
fn are_big_ints_within_percent(value1: &U256, value2: &U256, percent: f64) -> bool {
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
    let tolerance = (value2 * U256::from(percent_factor)) / U256::from(10000000000i64);

    difference <= tolerance
}

#[test]
fn test_swaps() {
    let test_data = read_test_data().expect("Failed to read test data");
    let vault = Vault::new();

    for swap_test in test_data.swaps {
        println!("Swap Test: {}", swap_test.test);
        // if swap_test.test != "8453-32641745-ReClamm-V2-Out-Of-Range.json" {
        //     continue;
        // }

        // Get the pool data for this test
        let pool_data = test_data
            .pools
            .get(&swap_test.test)
            .unwrap_or_else(|| panic!("Pool not found for test: {}", swap_test.test));

        // Convert pool data to PoolStateOrBuffer
        let pool_state_or_buffer = convert_to_pool_state(pool_data);

        // Create SwapInput
        let swap_input = SwapInput {
            amount_raw: swap_test.amount_raw,
            token_in: swap_test.token_in.clone(),
            token_out: swap_test.token_out.clone(),
            swap_kind: match swap_test.swap_kind {
                0 => SwapKind::GivenIn,
                1 => SwapKind::GivenOut,
                _ => panic!("Unsupported swap kind: {}", swap_test.swap_kind),
            },
        };

        // Perform swap operation
        let result = vault
            .swap(
                &swap_input,
                &pool_state_or_buffer,
                test_data.hook_state.as_ref(), // Pass hook state from test data
            )
            .expect("Swap failed");

        // Check if this is a Buffer pool (which has tolerance)
        match &pool_state_or_buffer {
            PoolStateOrBuffer::Pool(_pool_state) => {
                assert_eq!(
                    result, swap_test.output_raw,
                    "Swap result mismatch for test: {}",
                    swap_test.test
                );
            }
            PoolStateOrBuffer::Buffer(_) => {
                assert!(
                    are_big_ints_within_percent(&result, &swap_test.output_raw, 0.001),
                    "Buffer pool swap result outside tolerance for test: {}",
                    swap_test.test
                );
            }
        }
    }
}

use alloy_primitives::U256;
use balancer_maths_rust::common::types::{BasePoolState, PoolStateOrBuffer, SwapInput, SwapKind};
use balancer_maths_rust::hooks::stable_surge::StableSurgeHookState;
use balancer_maths_rust::hooks::types::HookState;
use balancer_maths_rust::pools::stable::{StableMutable, StableState};
use balancer_maths_rust::vault::Vault;
use std::str::FromStr;

/// Helper function to create the common pool state for these tests
fn create_test_pool_state() -> StableState {
    let base_pool_state = BasePoolState {
        pool_address: "0x6b49054c350b47ca9aa1331ab156a1eedbe94e79".to_string(),
        pool_type: "STABLE".to_string(),
        tokens: vec![
            "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599".to_string(),
            "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48".to_string(),
            "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2".to_string(),
        ],
        scaling_factors: vec![
            U256::from(10000000000u64),
            U256::from(1000000000000u64),
            U256::ONE,
        ],
        token_rates: vec![
            U256::from_str("109906780000000000000000").unwrap(),
            U256::from(1000000000000000000u64),
            U256::from_str("2682207000000000000000").unwrap(),
        ],
        balances_live_scaled_18: vec![
            U256::from_str("48623858539800000000").unwrap(),
            U256::from_str("37690904000000000000").unwrap(),
            U256::from_str("41886483864325323440").unwrap(),
        ],
        swap_fee: U256::from(1000000000000000u64),
        aggregate_swap_fee: U256::from(500000000000000000u64),
        total_supply: U256::from_str("150055175718346624897").unwrap(),
        supports_unbalanced_liquidity: true,
        hook_type: Some("StableSurge".to_string()),
    };

    let stable_mutable = StableMutable {
        amp: U256::from(500000u64),
    };

    StableState {
        base: base_pool_state,
        mutable: stable_mutable,
    }
}

/// Helper function to create the common hook state for these tests
fn create_test_hook_state() -> StableSurgeHookState {
    StableSurgeHookState {
        hook_type: "StableSurge".to_string(),
        amp: U256::from(500000u64),
        surge_threshold_percentage: U256::from(5000000000000000u64),
        max_surge_fee_percentage: U256::from(30000000000000000u64),
    }
}

#[test]
fn test_stable_surge_ts3_match_tenderly_simulation() {
    // Replicating: should match tenderly simulation
    // https://www.tdly.co/shared/simulation/350f9500-0ad1-4396-98d3-18a7f7576246

    let pool_state = create_test_pool_state();
    let hook_state = create_test_hook_state();
    let vault = Vault::new();

    let swap_input = SwapInput {
        swap_kind: SwapKind::GivenIn,
        amount_raw: U256::from(20000000000000000u64),
        token_in: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2".to_string(),
        token_out: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48".to_string(),
    };

    let output_amount = vault
        .swap(
            &swap_input,
            &PoolStateOrBuffer::Pool(Box::new(pool_state.into())),
            Some(&HookState::StableSurge(hook_state)),
        )
        .expect("Swap failed");

    assert_eq!(output_amount, U256::from(37594448u64));
}

#[test]
fn test_stable_surge_ts3_should_throw_error() {
    // Replicating: should match simulation (error case)
    // This test expects an error to be thrown

    let pool_state = create_test_pool_state();
    let hook_state = create_test_hook_state();
    let vault = Vault::new();

    let swap_input = SwapInput {
        swap_kind: SwapKind::GivenOut,
        amount_raw: U256::from(37690905u64),
        token_in: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2".to_string(),
        token_out: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48".to_string(),
    };

    let result = vault.swap(
        &swap_input,
        &PoolStateOrBuffer::Pool(Box::new(pool_state.into())),
        Some(&HookState::StableSurge(hook_state)),
    );

    // This test expects an error to be thrown
    assert!(result.is_err());
}

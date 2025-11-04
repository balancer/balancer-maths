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
            U256::from_str("85446472000000000000000").unwrap(),
            U256::from(1000000000000000000u64),
            U256::from_str("2021120000000000000000").unwrap(),
        ],
        balances_live_scaled_18: vec![
            U256::from_str("2865435476013920000000").unwrap(),
            U256::from_str("2537601715000000000000").unwrap(),
            U256::from_str("3266208348800096988780").unwrap(),
        ],
        swap_fee: U256::from(1000000000000000u64),
        aggregate_swap_fee: U256::from(500000000000000000u64),
        total_supply: U256::from_str("9332159723859490160669").unwrap(),
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
fn test_stable_surge_ts2_below_threshold_static_fee() {
    // Replicating: < surgeThresholdPercentage, should use staticSwapFee
    // https://www.tdly.co/shared/simulation/32c1de43-498d-44f1-af26-0dab982c7775

    let pool_state = create_test_pool_state();
    let hook_state = create_test_hook_state();
    let vault = Vault::new();

    let swap_input = SwapInput {
        swap_kind: SwapKind::GivenIn,
        amount_raw: U256::from(100000000u64),
        token_in: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48".to_string(),
        token_out: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2".to_string(),
    };

    let output_amount = vault
        .swap(
            &swap_input,
            &PoolStateOrBuffer::Pool(Box::new(pool_state.into())),
            Some(&HookState::StableSurge(hook_state)),
        )
        .expect("Swap failed");

    assert_eq!(output_amount, U256::from(49449850642484030u64));
}

#[test]
fn test_stable_surge_ts2_above_threshold_surge_fee() {
    // Replicating: > surgeThresholdPercentage, should use surge fee
    // https://www.tdly.co/shared/simulation/42cc571d-408f-47ac-a1d4-2546bee4b321

    let pool_state = create_test_pool_state();
    let hook_state = create_test_hook_state();
    let vault = Vault::new();

    let swap_input = SwapInput {
        swap_kind: SwapKind::GivenIn,
        amount_raw: U256::from(1000000000000000000u64),
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

    assert_eq!(output_amount, U256::from(1976459205u64));
}

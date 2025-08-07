use balancer_maths_rust::common::types::{SwapInput, SwapKind, BasePoolState};
use balancer_maths_rust::hooks::stable_surge::{StableSurgeHook, StableSurgeHookState};
use balancer_maths_rust::pools::stable::{StablePool, StableMutable, StableState};
use balancer_maths_rust::vault::Vault;
use num_bigint::BigInt;

#[test]
fn test_stable_surge_ts1_below_threshold_static_fee_case1() {
    // Replicating: < surgeThresholdPercentage, should use staticSwapFee
    // https://www.tdly.co/shared/simulation/e50584b3-d8ed-4633-b261-47401482c7b7
    
    let base_pool_state = BasePoolState {
        pool_address: "0x132F4bAa39330d9062fC52d81dF72F601DF8C01f".to_string(),
        pool_type: "STABLE".to_string(),
        tokens: vec![
            "0x7b79995e5f793a07bc00c21412e50ecae098e7f9".to_string(),
            "0xb19382073c7a0addbb56ac6af1808fa49e377b75".to_string(),
        ],
        scaling_factors: vec![BigInt::from(1), BigInt::from(1)],
        token_rates: vec![
            BigInt::from(1000000000000000000u64),
            BigInt::from(1000000000000000000u64),
        ],
        balances_live_scaled_18: vec![
            BigInt::from(10000000000000000u64),
            BigInt::from(10000000000000000000u64),
        ],
        swap_fee: BigInt::from(10000000000000000u64),
        aggregate_swap_fee: BigInt::from(10000000000000000u64),
        total_supply: BigInt::from(9079062661965173292u64),
        supports_unbalanced_liquidity: true,
        hook_type: Some("StableSurge".to_string()),
    };

    let stable_mutable = StableMutable {
        amp: BigInt::from(1000000u64),
    };

    let pool_state = StableState {
        base: base_pool_state,
        mutable: stable_mutable,
    };

    let hook_state = StableSurgeHookState {
        hook_type: "StableSurge".to_string(),
        amp: BigInt::from(1000000u64),
        surge_threshold_percentage: BigInt::from(300000000000000000u64),
        max_surge_fee_percentage: BigInt::from(950000000000000000u64),
    };

    let vault = Vault::new();

    let swap_input = SwapInput {
        swap_kind: SwapKind::GivenIn,
        amount_raw: BigInt::from(1000000000000000u64),
        token_in: "0x7b79995e5f793a07bc00c21412e50ecae098e7f9".to_string(),
        token_out: "0xb19382073c7a0addbb56ac6af1808fa49e377b75".to_string(),
    };

    let output_amount = vault.swap(
        &swap_input,
        &balancer_maths_rust::common::types::PoolStateOrBuffer::Pool(pool_state.into()),
        Some(&balancer_maths_rust::hooks::types::HookState::StableSurge(hook_state)),
    ).expect("Swap failed");
    
    assert_eq!(output_amount, BigInt::from(78522716365403684u64));
}

#[test]
fn test_stable_surge_ts1_below_threshold_static_fee_case2() {
    // Replicating: < surgeThresholdPercentage, should use staticSwapFee
    // https://www.tdly.co/shared/simulation/1220e0ec-1d3d-4f2a-8eb0-850fed8d15ed
    
    let base_pool_state = BasePoolState {
        pool_address: "0x132F4bAa39330d9062fC52d81dF72F601DF8C01f".to_string(),
        pool_type: "STABLE".to_string(),
        tokens: vec![
            "0x7b79995e5f793a07bc00c21412e50ecae098e7f9".to_string(),
            "0xb19382073c7a0addbb56ac6af1808fa49e377b75".to_string(),
        ],
        scaling_factors: vec![BigInt::from(1), BigInt::from(1)],
        token_rates: vec![
            BigInt::from(1000000000000000000u64),
            BigInt::from(1000000000000000000u64),
        ],
        balances_live_scaled_18: vec![
            BigInt::from(10000000000000000u64),
            BigInt::from(10000000000000000000u64),
        ],
        swap_fee: BigInt::from(10000000000000000u64),
        aggregate_swap_fee: BigInt::from(10000000000000000u64),
        total_supply: BigInt::from(9079062661965173292u64),
        supports_unbalanced_liquidity: true,
        hook_type: Some("StableSurge".to_string()),
    };

    let stable_mutable = StableMutable {
        amp: BigInt::from(1000000u64),
    };

    let pool_state = StableState {
        base: base_pool_state,
        mutable: stable_mutable,
    };

    let hook_state = StableSurgeHookState {
        hook_type: "StableSurge".to_string(),
        amp: BigInt::from(1000000u64),
        surge_threshold_percentage: BigInt::from(300000000000000000u64),
        max_surge_fee_percentage: BigInt::from(950000000000000000u64),
    };

    let vault = Vault::new();

    let swap_input = SwapInput {
        swap_kind: SwapKind::GivenIn,
        amount_raw: BigInt::from(10000000000000000u64),
        token_in: "0x7b79995e5f793a07bc00c21412e50ecae098e7f9".to_string(),
        token_out: "0xb19382073c7a0addbb56ac6af1808fa49e377b75".to_string(),
    };

    let output_amount = vault.swap(
        &swap_input,
        &balancer_maths_rust::common::types::PoolStateOrBuffer::Pool(pool_state.into()),
        Some(&balancer_maths_rust::hooks::types::HookState::StableSurge(hook_state)),
    ).expect("Swap failed");
    
    assert_eq!(output_amount, BigInt::from(452983383563178802u64));
}

#[test]
fn test_stable_surge_ts1_above_threshold_surge_fee() {
    // Replicating: > surgeThresholdPercentage, should use surge fee
    // https://www.tdly.co/shared/simulation/ce2a1146-68d4-49fc-b9d2-1fbc22086ea5
    
    let base_pool_state = BasePoolState {
        pool_address: "0x132F4bAa39330d9062fC52d81dF72F601DF8C01f".to_string(),
        pool_type: "STABLE".to_string(),
        tokens: vec![
            "0x7b79995e5f793a07bc00c21412e50ecae098e7f9".to_string(),
            "0xb19382073c7a0addbb56ac6af1808fa49e377b75".to_string(),
        ],
        scaling_factors: vec![BigInt::from(1), BigInt::from(1)],
        token_rates: vec![
            BigInt::from(1000000000000000000u64),
            BigInt::from(1000000000000000000u64),
        ],
        balances_live_scaled_18: vec![
            BigInt::from(10000000000000000u64),
            BigInt::from(10000000000000000000u64),
        ],
        swap_fee: BigInt::from(10000000000000000u64),
        aggregate_swap_fee: BigInt::from(10000000000000000u64),
        total_supply: BigInt::from(9079062661965173292u64),
        supports_unbalanced_liquidity: true,
        hook_type: Some("StableSurge".to_string()),
    };

    let stable_mutable = StableMutable {
        amp: BigInt::from(1000000u64),
    };

    let pool_state = StableState {
        base: base_pool_state,
        mutable: stable_mutable,
    };

    let hook_state = StableSurgeHookState {
        hook_type: "StableSurge".to_string(),
        amp: BigInt::from(1000000u64),
        surge_threshold_percentage: BigInt::from(300000000000000000u64),
        max_surge_fee_percentage: BigInt::from(950000000000000000u64),
    };

    let vault = Vault::new();

    let swap_input = SwapInput {
        swap_kind: SwapKind::GivenIn,
        amount_raw: BigInt::from(8000000000000000000u64),
        token_in: "0xb19382073c7a0addbb56ac6af1808fa49e377b75".to_string(),
        token_out: "0x7b79995e5f793a07bc00c21412e50ecae098e7f9".to_string(),
    };

    let output_amount = vault.swap(
        &swap_input,
        &balancer_maths_rust::common::types::PoolStateOrBuffer::Pool(pool_state.into()),
        Some(&balancer_maths_rust::hooks::types::HookState::StableSurge(hook_state)),
    ).expect("Swap failed");
    
    assert_eq!(output_amount, BigInt::from(3252130027531260u64));
}

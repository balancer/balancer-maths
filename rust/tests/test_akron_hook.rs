use balancer_maths_rust::common::types::{SwapInput, SwapKind, BasePoolState};
use balancer_maths_rust::hooks::akron::AkronHookState;
use balancer_maths_rust::pools::weighted::weighted_data::WeightedState;
use balancer_maths_rust::vault::Vault;
use num_bigint::BigInt;

/// Helper function to create the common pool state for these tests
fn create_test_pool_state() -> WeightedState {
    let base_pool_state = BasePoolState {
        pool_address: "0x4fbb7870dbe7a7ef4866a33c0eed73d395730dc0".to_string(),
        pool_type: "WEIGHTED".to_string(),
        tokens: vec![
            "0xC768c589647798a6EE01A91FdE98EF2ed046DBD6".to_string(),
            "0xe298b938631f750DD409fB18227C4a23dCdaab9b".to_string(),
        ],
        scaling_factors: vec![
            BigInt::from(1000000000000u64),
            BigInt::from(1u64),
        ],
        swap_fee: BigInt::from(10000000000000u64),
        aggregate_swap_fee: BigInt::from(500000000000000000u64),
        balances_live_scaled_18: vec![
            BigInt::parse_bytes(b"4313058813293560452630", 10).unwrap(),
            BigInt::parse_bytes(b"1641665567011677058", 10).unwrap(),
        ],
        token_rates: vec![
            BigInt::parse_bytes(b"1088293475435366304", 10).unwrap(),
            BigInt::parse_bytes(b"1026824525555904684", 10).unwrap(),
        ],
        total_supply: BigInt::parse_bytes(b"83925520418320097254", 10).unwrap(),
        supports_unbalanced_liquidity: false,
        hook_type: Some("Akron".to_string()),
    };

    WeightedState {
        base: base_pool_state,
        weights: vec![
            BigInt::from(500000000000000000u64),
            BigInt::from(500000000000000000u64),
        ],
    }
}

/// Helper function to create the common hook state for these tests
fn create_test_hook_state() -> AkronHookState {
    AkronHookState {
        hook_type: "Akron".to_string(),
        weights: vec![
            BigInt::from(500000000000000000u64),
            BigInt::from(500000000000000000u64),
        ],
        minimum_swap_fee_percentage: BigInt::from(10000000000000u64),
    }
}

#[test]
fn test_akron_minimum_fee_token_in_6_decimals_given_in() {
    // Replicating: should use minimum swap fee percentage - tokenIn 6 decimals, GivenIn
    let pool_state = create_test_pool_state();
    let hook_state = create_test_hook_state();
    let vault = Vault::new();

    let swap_input = SwapInput {
        swap_kind: SwapKind::GivenIn,
        amount_raw: BigInt::from(10000u64),
        token_in: "0xc768c589647798a6ee01a91fde98ef2ed046dbd6".to_string(),
        token_out: "0xe298b938631f750DD409fB18227C4a23dCdaab9b".to_string(),
    };

    let output_amount = vault.swap(
        &swap_input,
        &balancer_maths_rust::common::types::PoolStateOrBuffer::Pool(pool_state.into()),
        Some(&balancer_maths_rust::hooks::types::HookState::Akron(hook_state)),
    ).expect("Swap failed");
    
    assert_eq!(output_amount, BigInt::from(4034072160040u64));
}

#[test]
fn test_akron_minimum_fee_token_in_6_decimals_given_out() {
    // Replicating: should use minimum swap fee percentage - tokenIn 6 decimals, GivenOut
    let pool_state = create_test_pool_state();
    let hook_state = create_test_hook_state();
    let vault = Vault::new();

    let swap_input = SwapInput {
        swap_kind: SwapKind::GivenOut,
        amount_raw: BigInt::from(1034072160040u64),
        token_in: "0xc768c589647798a6ee01a91fde98ef2ed046dbd6".to_string(),
        token_out: "0xe298b938631f750DD409fB18227C4a23dCdaab9b".to_string(),
    };

    let output_amount = vault.swap(
        &swap_input,
        &balancer_maths_rust::common::types::PoolStateOrBuffer::Pool(pool_state.into()),
        Some(&balancer_maths_rust::hooks::types::HookState::Akron(hook_state)),
    ).expect("Swap failed");
    
    assert_eq!(output_amount, BigInt::from(2564u64));
}

#[test]
fn test_akron_minimum_fee_token_out_6_decimals_given_in() {
    // Replicating: should use minimum swap fee percentage - tokenOut 6 decimals, GivenIn
    let pool_state = create_test_pool_state();
    let hook_state = create_test_hook_state();
    let vault = Vault::new();

    let swap_input = SwapInput {
        swap_kind: SwapKind::GivenIn,
        amount_raw: BigInt::from(1000000000000u64),
        token_in: "0xe298b938631f750DD409fB18227C4a23dCdaab9b".to_string(),
        token_out: "0xc768c589647798a6ee01a91fde98ef2ed046dbd6".to_string(),
    };

    let output_amount = vault.swap(
        &swap_input,
        &balancer_maths_rust::common::types::PoolStateOrBuffer::Pool(pool_state.into()),
        Some(&balancer_maths_rust::hooks::types::HookState::Akron(hook_state)),
    ).expect("Swap failed");
    
    assert_eq!(output_amount, BigInt::from(2478u64));
}

#[test]
fn test_akron_minimum_fee_token_out_6_decimals_given_out() {
    // Replicating: should use minimum swap fee percentage - tokenOut 6 decimals, GivenOut
    let pool_state = create_test_pool_state();
    let hook_state = create_test_hook_state();
    let vault = Vault::new();

    let swap_input = SwapInput {
        swap_kind: SwapKind::GivenOut,
        amount_raw: BigInt::from(10000u64),
        token_in: "0xe298b938631f750DD409fB18227C4a23dCdaab9b".to_string(),
        token_out: "0xc768c589647798a6ee01a91fde98ef2ed046dbd6".to_string(),
    };

    let output_amount = vault.swap(
        &swap_input,
        &balancer_maths_rust::common::types::PoolStateOrBuffer::Pool(pool_state.into()),
        Some(&balancer_maths_rust::hooks::types::HookState::Akron(hook_state)),
    ).expect("Swap failed");
    
    assert_eq!(output_amount, BigInt::from(4034173201018u64));
}

#[test]
fn test_akron_lvr_fee_token_in_6_decimals_given_in() {
    // Replicating: should use LVRFee - tokenIn 6 decimals, GivenIn
    let pool_state = create_test_pool_state();
    let hook_state = create_test_hook_state();
    let vault = Vault::new();

    let swap_input = SwapInput {
        swap_kind: SwapKind::GivenIn,
        amount_raw: BigInt::from(10000000u64),
        token_in: "0xc768c589647798a6ee01a91fde98ef2ed046dbd6".to_string(),
        token_out: "0xe298b938631f750DD409fB18227C4a23dCdaab9b".to_string(),
    };

    let output_amount = vault.swap(
        &swap_input,
        &balancer_maths_rust::common::types::PoolStateOrBuffer::Pool(pool_state.into()),
        Some(&balancer_maths_rust::hooks::types::HookState::Akron(hook_state)),
    ).expect("Swap failed");
    
    assert_eq!(output_amount, BigInt::from(4013866684978601u64));
}

#[test]
fn test_akron_lvr_fee_token_in_6_decimals_given_out() {
    // Replicating: should use LVRFee - tokenIn 6 decimals, GivenOut
    let pool_state = create_test_pool_state();
    let hook_state = create_test_hook_state();
    let vault = Vault::new();

    let swap_input = SwapInput {
        swap_kind: SwapKind::GivenOut,
        amount_raw: BigInt::from(10000000000000000u64),
        token_in: "0xc768c589647798a6ee01a91fde98ef2ed046dbd6".to_string(),
        token_out: "0xe298b938631f750DD409fB18227C4a23dCdaab9b".to_string(),
    };

    let output_amount = vault.swap(
        &swap_input,
        &balancer_maths_rust::common::types::PoolStateOrBuffer::Pool(pool_state.into()),
        Some(&balancer_maths_rust::hooks::types::HookState::Akron(hook_state)),
    ).expect("Swap failed");
    
    assert_eq!(output_amount, BigInt::from(25102559u64));
}

#[test]
fn test_akron_lvr_fee_token_out_6_decimals_given_in() {
    // Replicating: should use LVRFee - tokenOut 6 decimals, GivenIn
    let pool_state = create_test_pool_state();
    let hook_state = create_test_hook_state();
    let vault = Vault::new();

    let swap_input = SwapInput {
        swap_kind: SwapKind::GivenIn,
        amount_raw: BigInt::from(10000000000000000u64),
        token_in: "0xe298b938631f750DD409fB18227C4a23dCdaab9b".to_string(),
        token_out: "0xc768c589647798a6ee01a91fde98ef2ed046dbd6".to_string(),
    };

    let output_amount = vault.swap(
        &swap_input,
        &balancer_maths_rust::common::types::PoolStateOrBuffer::Pool(pool_state.into()),
        Some(&balancer_maths_rust::hooks::types::HookState::Akron(hook_state)),
    ).expect("Swap failed");
    
    assert_eq!(output_amount, BigInt::from(24482275u64));
}

#[test]
fn test_akron_lvr_fee_token_out_6_decimals_given_out() {
    // Replicating: should use LVRFee - tokenOut 6 decimals, GivenOut
    let pool_state = create_test_pool_state();
    let hook_state = create_test_hook_state();
    let vault = Vault::new();

    let swap_input = SwapInput {
        swap_kind: SwapKind::GivenOut,
        amount_raw: BigInt::from(100000000u64),
        token_in: "0xe298b938631f750DD409fB18227C4a23dCdaab9b".to_string(),
        token_out: "0xc768c589647798a6ee01a91fde98ef2ed046dbd6".to_string(),
    };

    let output_amount = vault.swap(
        &swap_input,
        &balancer_maths_rust::common::types::PoolStateOrBuffer::Pool(pool_state.into()),
        Some(&balancer_maths_rust::hooks::types::HookState::Akron(hook_state)),
    ).expect("Swap failed");
    
    assert_eq!(output_amount, BigInt::from(42485246562777219u64));
}

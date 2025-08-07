use balancer_maths_rust::common::types::{SwapInput, SwapKind, BasePoolState};
use balancer_maths_rust::hooks::stable_surge::{StableSurgeHook, StableSurgeHookState};
use balancer_maths_rust::pools::stable::{StablePool, StableMutable, StableState};
use balancer_maths_rust::vault::Vault;
use num_bigint::BigInt;

#[test]
fn test_stable_surge_ts3_match_tenderly_simulation() {
    // Replicating: should match tenderly simulation
    // https://www.tdly.co/shared/simulation/350f9500-0ad1-4396-98d3-18a7f7576246
    
    let base_pool_state = BasePoolState {
        pool_address: "0x6b49054c350b47ca9aa1331ab156a1eedbe94e79".to_string(),
        pool_type: "STABLE".to_string(),
        tokens: vec![
            "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599".to_string(),
            "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48".to_string(),
            "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2".to_string(),
        ],
        scaling_factors: vec![
            BigInt::from(10000000000u64),
            BigInt::from(1000000000000u64),
            BigInt::from(1u64),
        ],
        token_rates: vec![
            BigInt::parse_bytes(b"109906780000000000000000", 10).unwrap(),
            BigInt::from(1000000000000000000u64),
            BigInt::parse_bytes(b"2682207000000000000000", 10).unwrap(),
        ],
        balances_live_scaled_18: vec![
            BigInt::parse_bytes(b"48623858539800000000", 10).unwrap(),
            BigInt::parse_bytes(b"37690904000000000000", 10).unwrap(),
            BigInt::parse_bytes(b"41886483864325323440", 10).unwrap(),
        ],
        swap_fee: BigInt::from(1000000000000000u64),
        aggregate_swap_fee: BigInt::from(500000000000000000u64),
        total_supply: BigInt::parse_bytes(b"150055175718346624897", 10).unwrap(),
        supports_unbalanced_liquidity: true,
        hook_type: Some("StableSurge".to_string()),
    };

    let stable_mutable = StableMutable {
        amp: BigInt::from(500000u64),
    };

    let pool_state = StableState {
        base: base_pool_state,
        mutable: stable_mutable,
    };

    let hook_state = StableSurgeHookState {
        hook_type: "StableSurge".to_string(),
        amp: BigInt::from(500000u64),
        surge_threshold_percentage: BigInt::from(5000000000000000u64),
        max_surge_fee_percentage: BigInt::from(30000000000000000u64),
    };

    let vault = Vault::new();

    let swap_input = SwapInput {
        swap_kind: SwapKind::GivenIn,
        amount_raw: BigInt::from(20000000000000000u64),
        token_in: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2".to_string(),
        token_out: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48".to_string(),
    };

    let output_amount = vault.swap(
        &swap_input,
        &balancer_maths_rust::common::types::PoolStateOrBuffer::Pool(pool_state.into()),
        Some(&balancer_maths_rust::hooks::types::HookState::StableSurge(hook_state)),
    ).expect("Swap failed");
    
    assert_eq!(output_amount, BigInt::from(37594448u64));
}

#[test]
fn test_stable_surge_ts3_should_throw_error() {
    // Replicating: should match simulation (error case)
    // This test expects an error to be thrown
    
    let base_pool_state = BasePoolState {
        pool_address: "0x6b49054c350b47ca9aa1331ab156a1eedbe94e79".to_string(),
        pool_type: "STABLE".to_string(),
        tokens: vec![
            "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599".to_string(),
            "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48".to_string(),
            "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2".to_string(),
        ],
        scaling_factors: vec![
            BigInt::from(10000000000u64),
            BigInt::from(1000000000000u64),
            BigInt::from(1u64),
        ],
        token_rates: vec![
            BigInt::parse_bytes(b"109906780000000000000000", 10).unwrap(),
            BigInt::from(1000000000000000000u64),
            BigInt::parse_bytes(b"2682207000000000000000", 10).unwrap(),
        ],
        balances_live_scaled_18: vec![
            BigInt::parse_bytes(b"48623858539800000000", 10).unwrap(),
            BigInt::parse_bytes(b"37690904000000000000", 10).unwrap(),
            BigInt::parse_bytes(b"41886483864325323440", 10).unwrap(),
        ],
        swap_fee: BigInt::from(1000000000000000u64),
        aggregate_swap_fee: BigInt::from(500000000000000000u64),
        total_supply: BigInt::parse_bytes(b"150055175718346624897", 10).unwrap(),
        supports_unbalanced_liquidity: true,
        hook_type: Some("StableSurge".to_string()),
    };

    let stable_mutable = StableMutable {
        amp: BigInt::from(500000u64),
    };

    let pool_state = StableState {
        base: base_pool_state,
        mutable: stable_mutable,
    };

    let hook_state = StableSurgeHookState {
        hook_type: "StableSurge".to_string(),
        amp: BigInt::from(500000u64),
        surge_threshold_percentage: BigInt::from(5000000000000000u64),
        max_surge_fee_percentage: BigInt::from(30000000000000000u64),
    };

    let vault = Vault::new();

    let swap_input = SwapInput {
        swap_kind: SwapKind::GivenOut,
        amount_raw: BigInt::from(37690905u64),
        token_in: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2".to_string(),
        token_out: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48".to_string(),
    };

    // This should throw an error: 'tokenAmountOut is greater than the balance available in the pool'
    let result = vault.swap(
        &swap_input,
        &balancer_maths_rust::common::types::PoolStateOrBuffer::Pool(pool_state.into()),
        Some(&balancer_maths_rust::hooks::types::HookState::StableSurge(hook_state)),
    );
    
    assert!(result.is_err());
}

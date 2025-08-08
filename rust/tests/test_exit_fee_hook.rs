use balancer_maths_rust::common::types::*;
use balancer_maths_rust::hooks::types::HookState;
use balancer_maths_rust::hooks::ExitFeeHookState;
use balancer_maths_rust::pools::weighted::weighted_data::WeightedState;
use balancer_maths_rust::vault::Vault;
use num_bigint::BigInt;
use num_traits::Zero;

/// Helper function to create the common remove liquidity input for these tests
fn create_test_remove_liquidity_input() -> RemoveLiquidityInput {
    RemoveLiquidityInput {
        pool: "0x03722034317d8fb16845213bd3ce15439f9ce136".to_string(),
        min_amounts_out_raw: vec![BigInt::from(1), BigInt::from(1)],
        max_bpt_amount_in_raw: BigInt::from(10000000000000u64),
        kind: RemoveLiquidityKind::Proportional,
    }
}

/// Helper function to create the common pool state for these tests
fn create_test_pool_state() -> WeightedState {
    WeightedState {
        base: BasePoolState {
            pool_address: "0x03722034317d8fb16845213bd3ce15439f9ce136".to_string(),
            pool_type: "WEIGHTED".to_string(),
            tokens: vec![
                "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9".to_string(),
                "0xb19382073c7A0aDdbb56Ac6AF1808Fa49e377B75".to_string(),
            ],
            scaling_factors: vec![BigInt::from(1), BigInt::from(1)],
            swap_fee: BigInt::from(100000000000000000u64),
            balances_live_scaled_18: vec![BigInt::from(5000000000000000u64), BigInt::from(5000000000000000000u64)],
            token_rates: vec![BigInt::from(1000000000000000000u64), BigInt::from(1000000000000000000u64)],
            total_supply: BigInt::from(158113883008415798u64),
            aggregate_swap_fee: BigInt::zero(),
            supports_unbalanced_liquidity: true,
            hook_type: Some("ExitFee".to_string()),
        },
        weights: vec![BigInt::from(500000000000000000u64), BigInt::from(500000000000000000u64)],
    }
}

/// Helper function to create the common hook state for these tests
fn create_test_hook_state() -> ExitFeeHookState {
    ExitFeeHookState {
        hook_type: "ExitFee".to_string(),
        tokens: vec![
            "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9".to_string(),
            "0xb19382073c7A0aDdbb56Ac6AF1808Fa49e377B75".to_string(),
        ],
        remove_liquidity_hook_fee_percentage: BigInt::zero(),
    }
}

#[test]
fn test_hook_exit_fee_no_fee() {
    let remove_liquidity_input = create_test_remove_liquidity_input();
    let weighted_state = create_test_pool_state();
    let hook_state = create_test_hook_state();

    let vault = Vault::new();
    let result = vault.remove_liquidity(
        &remove_liquidity_input,
        &PoolState::Weighted(weighted_state),
        Some(&HookState::ExitFee(hook_state)),
    ).unwrap();

    // Expected values from Python test
    assert_eq!(result.amounts_out_raw[0], BigInt::from(316227766016u64));
    assert_eq!(result.amounts_out_raw[1], BigInt::from(316227766016844u64));
}

#[test]
fn test_hook_exit_fee_with_fee() {
    let remove_liquidity_input = create_test_remove_liquidity_input();
    let weighted_state = create_test_pool_state();
    
    // 5% fee
    let mut hook_state = create_test_hook_state();
    hook_state.remove_liquidity_hook_fee_percentage = BigInt::from(50000000000000000u64);

    let vault = Vault::new();
    let result = vault.remove_liquidity(
        &remove_liquidity_input,
        &PoolState::Weighted(weighted_state),
        Some(&HookState::ExitFee(hook_state)),
    ).unwrap();

    // Expected values from Python test
    assert_eq!(result.amounts_out_raw[0], BigInt::from(300416377716u64));
    assert_eq!(result.amounts_out_raw[1], BigInt::from(300416377716002u64));
}

use balancer_maths_rust::common::types::{
    AddLiquidityInput, AddLiquidityKind, BasePoolState, PoolState, RemoveLiquidityInput,
    RemoveLiquidityKind,
};
use balancer_maths_rust::hooks::stable_surge::StableSurgeHookState;
use balancer_maths_rust::hooks::types::HookState;
use balancer_maths_rust::pools::stable::{StableMutable, StableState};
use balancer_maths_rust::vault::Vault;
use num_bigint::BigInt;
use num_traits::identities::Zero;

/// Helper function to create the common pool state for these tests
fn create_test_pool_state() -> StableState {
    let base_pool_state = BasePoolState {
        pool_address: "0x950682e741abd1498347a93b942463af4ec7132b".to_string(),
        pool_type: "STABLE".to_string(),
        tokens: vec![
            "0x99999999999999Cc837C997B882957daFdCb1Af9".to_string(),
            "0xC71Ea051a5F82c67ADcF634c36FFE6334793D24C".to_string(),
        ],
        scaling_factors: vec![BigInt::from(1), BigInt::from(1)],
        token_rates: vec![
            BigInt::from(1101505915091109485u64),
            BigInt::from(1016263325751437314u64),
        ],
        balances_live_scaled_18: vec![
            BigInt::from(1315930484174775273u64),
            BigInt::from(1307696122829730394u64),
        ],
        swap_fee: BigInt::from(400000000000000u64),
        aggregate_swap_fee: BigInt::from(500000000000000000u64),
        total_supply: BigInt::from(2557589757607855441u64),
        supports_unbalanced_liquidity: true,
        hook_type: Some("StableSurge".to_string()),
    };

    let stable_mutable = StableMutable {
        amp: BigInt::from(1000000u64),
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
        amp: BigInt::from(1000000u64),
        surge_threshold_percentage: BigInt::from(20000000000000000u64),
        max_surge_fee_percentage: BigInt::from(50000000000000000u64),
    }
}

#[test]
fn test_pool_not_surging_unbalanced_add_liquidity_succeeds() {
    let pool_state = create_test_pool_state();
    let hook_state = create_test_hook_state();
    let vault = Vault::new();

    let add_liquidity_input = AddLiquidityInput {
        pool: "0x950682e741abd1498347a93b942463af4ec7132b".to_string(),
        max_amounts_in_raw: vec![BigInt::from(10000000000u64), BigInt::from(10000000000u64)],
        min_bpt_amount_out_raw: BigInt::zero(),
        kind: AddLiquidityKind::Unbalanced,
    };

    let result = vault
        .add_liquidity(
            &add_liquidity_input,
            &PoolState::Stable(pool_state),
            Some(&HookState::StableSurge(hook_state)),
        )
        .expect("Add liquidity failed");

    assert_eq!(result.bpt_amount_out_raw, BigInt::from(20644492894u64));
    assert_eq!(
        result.amounts_in_raw,
        vec![BigInt::from(10000000000u64), BigInt::from(10000000000u64),]
    );
}

#[test]
fn test_pool_not_surging_single_token_exact_out_add_liquidity_succeeds() {
    let pool_state = create_test_pool_state();
    let hook_state = create_test_hook_state();
    let vault = Vault::new();

    let add_liquidity_input = AddLiquidityInput {
        pool: "0x950682e741abd1498347a93b942463af4ec7132b".to_string(),
        max_amounts_in_raw: vec![BigInt::from(10000000000u64), BigInt::zero()],
        min_bpt_amount_out_raw: BigInt::from(10000000000u64),
        kind: AddLiquidityKind::SingleTokenExactOut,
    };

    let result = vault
        .add_liquidity(
            &add_liquidity_input,
            &PoolState::Stable(pool_state),
            Some(&HookState::StableSurge(hook_state)),
        )
        .expect("Add liquidity failed");

    assert_eq!(result.bpt_amount_out_raw, BigInt::from(10000000000u64));
    assert_eq!(
        result.amounts_in_raw,
        vec![BigInt::from(9314773070u64), BigInt::zero()]
    );
}

#[test]
fn test_pool_not_surging_proportional_remove_liquidity_succeeds() {
    let pool_state = create_test_pool_state();
    let hook_state = create_test_hook_state();
    let vault = Vault::new();

    let remove_liquidity_input = RemoveLiquidityInput {
        pool: "0x950682e741abd1498347a93b942463af4ec7132b".to_string(),
        max_bpt_amount_in_raw: BigInt::from(100000000000000000u64),
        min_amounts_out_raw: vec![BigInt::from(1u64), BigInt::from(1u64)],
        kind: RemoveLiquidityKind::Proportional,
    };

    let result = vault
        .remove_liquidity(
            &remove_liquidity_input,
            &PoolState::Stable(pool_state),
            Some(&HookState::StableSurge(hook_state)),
        )
        .expect("Remove liquidity failed");

    assert_eq!(
        result.bpt_amount_in_raw,
        BigInt::from(100000000000000000u64)
    );
    assert_eq!(
        result.amounts_out_raw,
        vec![
            BigInt::from(46710576781505052u64),
            BigInt::from(50311781860935300u64),
        ]
    );
}

#[test]
fn test_pool_not_surging_single_token_exact_in_remove_liquidity_succeeds() {
    let pool_state = create_test_pool_state();
    let hook_state = create_test_hook_state();
    let vault = Vault::new();

    let remove_liquidity_input = RemoveLiquidityInput {
        pool: "0x950682e741abd1498347a93b942463af4ec7132b".to_string(),
        max_bpt_amount_in_raw: BigInt::from(10000000000u64),
        min_amounts_out_raw: vec![BigInt::from(1u64), BigInt::zero()],
        kind: RemoveLiquidityKind::SingleTokenExactIn,
    };

    let result = vault
        .remove_liquidity(
            &remove_liquidity_input,
            &PoolState::Stable(pool_state),
            Some(&HookState::StableSurge(hook_state)),
        )
        .expect("Remove liquidity failed");

    assert_eq!(result.bpt_amount_in_raw, BigInt::from(10000000000u64));
    assert_eq!(
        result.amounts_out_raw,
        vec![BigInt::from(9311058836u64), BigInt::zero()]
    );
}

#[test]
fn test_pool_not_surging_single_token_exact_out_remove_liquidity_succeeds() {
    let pool_state = create_test_pool_state();
    let hook_state = create_test_hook_state();
    let vault = Vault::new();

    let remove_liquidity_input = RemoveLiquidityInput {
        pool: "0x950682e741abd1498347a93b942463af4ec7132b".to_string(),
        max_bpt_amount_in_raw: BigInt::from(10000000000u64),
        min_amounts_out_raw: vec![BigInt::from(10000000u64), BigInt::zero()],
        kind: RemoveLiquidityKind::SingleTokenExactOut,
    };

    let result = vault
        .remove_liquidity(
            &remove_liquidity_input,
            &PoolState::Stable(pool_state),
            Some(&HookState::StableSurge(hook_state)),
        )
        .expect("Remove liquidity failed");

    assert_eq!(result.bpt_amount_in_raw, BigInt::from(10739922u64));
    assert_eq!(
        result.amounts_out_raw,
        vec![BigInt::from(10000000u64), BigInt::zero()]
    );
}

#[test]
fn test_pool_surging_unbalanced_add_liquidity_throws() {
    let pool_state = create_test_pool_state();
    let hook_state = create_test_hook_state();
    let vault = Vault::new();

    let add_liquidity_input = AddLiquidityInput {
        pool: "0x950682e741abd1498347a93b942463af4ec7132b".to_string(),
        max_amounts_in_raw: vec![
            BigInt::from(10000000u64),
            BigInt::from(100000000000000000u64),
        ],
        min_bpt_amount_out_raw: BigInt::zero(),
        kind: AddLiquidityKind::Unbalanced,
    };

    let result = vault.add_liquidity(
        &add_liquidity_input,
        &PoolState::Stable(pool_state),
        Some(&HookState::StableSurge(hook_state)),
    );

    assert!(result.is_err());
    assert!(result
        .unwrap_err()
        .to_string()
        .contains("AfterAddLiquidityHookFailed"));
}

#[test]
fn test_pool_surging_single_token_exact_out_add_liquidity_throws() {
    let pool_state = create_test_pool_state();
    let hook_state = create_test_hook_state();
    let vault = Vault::new();

    let add_liquidity_input = AddLiquidityInput {
        pool: "0x950682e741abd1498347a93b942463af4ec7132b".to_string(),
        max_amounts_in_raw: vec![BigInt::from(100000000000000000u64), BigInt::zero()],
        min_bpt_amount_out_raw: BigInt::from(100000000000000000u64),
        kind: AddLiquidityKind::SingleTokenExactOut,
    };

    let result = vault.add_liquidity(
        &add_liquidity_input,
        &PoolState::Stable(pool_state),
        Some(&HookState::StableSurge(hook_state)),
    );

    assert!(result.is_err());
    assert!(result
        .unwrap_err()
        .to_string()
        .contains("AfterAddLiquidityHookFailed"));
}

#[test]
fn test_pool_surging_single_token_exact_in_remove_liquidity_throws() {
    let pool_state = create_test_pool_state();
    let hook_state = create_test_hook_state();
    let vault = Vault::new();

    let remove_liquidity_input = RemoveLiquidityInput {
        pool: "0x950682e741abd1498347a93b942463af4ec7132b".to_string(),
        max_bpt_amount_in_raw: BigInt::from(100000000000000000u64),
        min_amounts_out_raw: vec![BigInt::from(1u64), BigInt::zero()],
        kind: RemoveLiquidityKind::SingleTokenExactIn,
    };

    let result = vault.remove_liquidity(
        &remove_liquidity_input,
        &PoolState::Stable(pool_state),
        Some(&HookState::StableSurge(hook_state)),
    );

    assert!(result.is_err());
    assert!(result
        .unwrap_err()
        .to_string()
        .contains("AfterRemoveLiquidityHookFailed"));
}

#[test]
fn test_pool_surging_single_token_exact_out_remove_liquidity_throws() {
    let pool_state = create_test_pool_state();
    let hook_state = create_test_hook_state();
    let vault = Vault::new();

    let remove_liquidity_input = RemoveLiquidityInput {
        pool: "0x950682e741abd1498347a93b942463af4ec7132b".to_string(),
        max_bpt_amount_in_raw: BigInt::from(100000000000000000u64),
        min_amounts_out_raw: vec![BigInt::from(100000000000000000u64), BigInt::zero()],
        kind: RemoveLiquidityKind::SingleTokenExactOut,
    };

    let result = vault.remove_liquidity(
        &remove_liquidity_input,
        &PoolState::Stable(pool_state),
        Some(&HookState::StableSurge(hook_state)),
    );

    assert!(result.is_err());
    assert!(result
        .unwrap_err()
        .to_string()
        .contains("AfterRemoveLiquidityHookFailed"));
}

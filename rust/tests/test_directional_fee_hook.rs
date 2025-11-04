use alloy_primitives::U256;
use balancer_maths_rust::common::types::{
    BasePoolState, PoolStateOrBuffer, SwapInput, SwapKind, SwapParams,
};
use balancer_maths_rust::hooks::types::HookState;
use balancer_maths_rust::hooks::{DirectionalFeeHook, DirectionalFeeHookState};
use balancer_maths_rust::pools::stable::stable_data::{StableMutable, StableState};
use balancer_maths_rust::vault::Vault;
use balancer_maths_rust::HookBase;
use std::str::FromStr;

fn create_stable_pool_state_with_hook() -> StableState {
    let base = BasePoolState {
        pool_address: "0xb4cd36aba5d75feb6bf2b8512dbf8fbd8add3656".to_string(),
        pool_type: "STABLE".to_string(),
        tokens: vec![
            "0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0".to_string(),
            "0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357".to_string(),
        ],
        scaling_factors: vec![U256::from(1000000000000u64), U256::ONE],
        token_rates: vec![
            U256::from(1000000000000000000u64),
            U256::from(1000000000000000000u64),
        ],
        balances_live_scaled_18: vec![
            U256::from_str("20000000000000000000000").unwrap(),
            U256::from_str("20000000000000000000000").unwrap(),
        ],
        swap_fee: U256::from(1000000000000000u64),
        aggregate_swap_fee: U256::from(0u64),
        total_supply: U256::from_str("40000000000000000000000").unwrap(),
        supports_unbalanced_liquidity: true,
        hook_type: Some("DirectionalFee".to_string()),
    };
    let mutable = StableMutable {
        amp: U256::from(1000000u64),
    };
    StableState { base, mutable }
}

fn create_stable_pool_state_without_hook() -> StableState {
    let mut state = create_stable_pool_state_with_hook();
    state.base.hook_type = None;
    state
}

fn create_swap_input() -> SwapInput {
    SwapInput {
        swap_kind: SwapKind::GivenIn,
        amount_raw: U256::from(100000000u64),
        token_in: "0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0".to_string(),
        token_out: "0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357".to_string(),
    }
}

#[test]
fn test_directional_fee_computes_fee() {
    let hook = DirectionalFeeHook::new();
    let pool_state = create_stable_pool_state_with_hook();

    // Build swap params equivalent via vault swap pathway: call hook directly here
    let balances = pool_state.base.balances_live_scaled_18.clone();
    let amount_scaled_18 = U256::from_str("100000000000000000000").unwrap();
    let params = SwapParams {
        swap_kind: SwapKind::GivenIn,
        token_in_index: 0,
        token_out_index: 1,
        amount_scaled_18,
        balances_live_scaled_18: balances,
    };

    let res = hook.on_compute_dynamic_swap_fee(
        &params,
        &U256::from(0u64),
        &HookState::DirectionalFee(DirectionalFeeHookState::default()),
    );
    assert!(res.success);
    assert!(res.dynamic_swap_fee > U256::from(0u64));
}

#[test]
fn test_directional_fee_uses_static_when_lower() {
    let hook = DirectionalFeeHook::new();
    let pool_state = create_stable_pool_state_with_hook();
    let balances = pool_state.base.balances_live_scaled_18.clone();
    let params = SwapParams {
        swap_kind: SwapKind::GivenIn,
        token_in_index: 0,
        token_out_index: 1,
        amount_scaled_18: U256::ONE,
        balances_live_scaled_18: balances,
    };
    let static_fee = U256::from(1000000000000000u64);
    let res = hook.on_compute_dynamic_swap_fee(
        &params,
        &static_fee,
        &HookState::DirectionalFee(DirectionalFeeHookState::default()),
    );
    assert!(res.success);
    assert_eq!(res.dynamic_swap_fee, static_fee);
}

#[test]
fn test_directional_fee_specific_value_given_out_path() {
    let hook = DirectionalFeeHook::new();
    let pool_state = create_stable_pool_state_with_hook();
    let balances = pool_state.base.balances_live_scaled_18.clone();
    let amount_scaled_18 = U256::from_str("100000000000000000000").unwrap();
    let params = SwapParams {
        swap_kind: SwapKind::GivenIn,
        token_in_index: 0,
        token_out_index: 1,
        amount_scaled_18,
        balances_live_scaled_18: balances,
    };
    let static_fee = U256::from(1000000000000000u64);
    let res = hook.on_compute_dynamic_swap_fee(
        &params,
        &static_fee,
        &HookState::DirectionalFee(DirectionalFeeHookState::default()),
    );
    assert!(res.success);
    assert_eq!(res.dynamic_swap_fee, U256::from(5000000000000000u64));
}

#[test]
fn test_directional_fee_integration_vault_swap_with_and_without_hook() {
    let vault = Vault::new();
    let pool_with_hook = create_stable_pool_state_with_hook();
    let pool_without_hook = create_stable_pool_state_without_hook();

    let swap_input = create_swap_input();

    let out_with_hook = vault
        .swap(
            &swap_input,
            &PoolStateOrBuffer::Pool(Box::new(pool_with_hook.clone().into())),
            Some(&HookState::DirectionalFee(
                DirectionalFeeHookState::default(),
            )),
        )
        .expect("swap with hook failed");

    let out_without_hook = vault
        .swap(
            &swap_input,
            &PoolStateOrBuffer::Pool(Box::new(pool_without_hook.into())),
            None,
        )
        .expect("swap without hook failed");

    assert!(out_with_hook < out_without_hook);
}

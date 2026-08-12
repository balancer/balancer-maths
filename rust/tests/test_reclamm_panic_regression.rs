//! Regression: reCLAMM on_swap must not panic on off-centre dusty pool states.

use alloy_primitives::U256;
use balancer_maths_rust::common::types::{BasePoolState, SwapKind, SwapParams};
use balancer_maths_rust::pools::reclamm::{
    ReClammImmutable, ReClammMutable, ReClammPool, ReClammState,
};
use balancer_maths_rust::pools::reclammv2::{
    ReClammV2Immutable, ReClammV2Mutable, ReClammV2Pool, ReClammV2State,
};
use balancer_maths_rust::{PoolBase, PoolError};

const WAD: U256 = U256::from_limbs([1_000_000_000_000_000_000, 0, 0, 0]);

fn base_state(balances: Vec<U256>, pool_type: &str) -> BasePoolState {
    BasePoolState {
        pool_address: "0x0000000000000000000000000000000000000001".to_string(),
        pool_type: pool_type.to_string(),
        tokens: vec![
            "0x000000000000000000000000000000000000000a".to_string(),
            "0x000000000000000000000000000000000000000b".to_string(),
        ],
        scaling_factors: vec![U256::from(1u64), U256::from(1u64)],
        token_rates: vec![WAD, WAD],
        balances_live_scaled_18: balances,
        swap_fee: U256::ZERO,
        aggregate_swap_fee: U256::ZERO,
        total_supply: WAD,
        supports_unbalanced_liquidity: false,
        hook_type: None,
    }
}

/// Case 1 from findings: balances [1e8, 1], virtual [1e8, 1e8] - truncates invariant to 0.
fn panic_case_balances() -> Vec<U256> {
    Vec::from([U256::from(100_000_000u64), U256::from(1u64)])
}

fn panic_case_virtuals() -> Vec<U256> {
    let virtual_balance = U256::from(100_000_000u64);
    Vec::from([virtual_balance, virtual_balance])
}

fn make_v2_pool() -> ReClammV2Pool {
    let balances = panic_case_balances();
    let state = ReClammV2State {
        base: base_state(balances.clone(), "RECLAMM_V2"),
        mutable: ReClammV2Mutable {
            last_virtual_balances: panic_case_virtuals(),
            daily_price_shift_base: WAD,
            last_timestamp: U256::from(100u64),
            current_timestamp: U256::from(200u64),
            centeredness_margin: WAD / U256::from(2u64),
            start_fourth_root_price_ratio: WAD,
            end_fourth_root_price_ratio: WAD,
            // Price-ratio update inactive so the price-range path runs.
            price_ratio_update_start_time: U256::ZERO,
            price_ratio_update_end_time: U256::ZERO,
        },
        immutable: ReClammV2Immutable {
            pool_address: "0x0000000000000000000000000000000000000001".to_string(),
            tokens: vec![
                "0x000000000000000000000000000000000000000a".to_string(),
                "0x000000000000000000000000000000000000000b".to_string(),
            ],
        },
    };
    ReClammV2Pool::new(state)
}

fn make_v1_pool() -> ReClammPool {
    let balances = panic_case_balances();
    let state = ReClammState {
        base: base_state(balances.clone(), "RECLAMM"),
        mutable: ReClammMutable {
            last_virtual_balances: panic_case_virtuals(),
            daily_price_shift_base: WAD,
            last_timestamp: U256::from(100u64),
            current_timestamp: U256::from(200u64),
            centeredness_margin: WAD / U256::from(2u64),
            start_fourth_root_price_ratio: WAD,
            end_fourth_root_price_ratio: WAD,
            price_ratio_update_start_time: U256::ZERO,
            price_ratio_update_end_time: U256::ZERO,
        },
        immutable: ReClammImmutable {
            pool_address: "0x0000000000000000000000000000000000000001".to_string(),
            tokens: vec![
                "0x000000000000000000000000000000000000000a".to_string(),
                "0x000000000000000000000000000000000000000b".to_string(),
            ],
        },
    };
    ReClammPool::new(state)
}

fn swap_params(balances: Vec<U256>) -> SwapParams {
    SwapParams {
        swap_kind: SwapKind::GivenIn,
        token_in_index: 0,
        token_out_index: 1,
        amount_scaled_18: U256::from(1u64),
        balances_live_scaled_18: balances,
    }
}

#[test]
fn reclamm_v2_on_swap_returns_zero_invariant_on_dusty_off_centre_pool() {
    let pool = make_v2_pool();
    let params = swap_params(panic_case_balances());
    let result = pool.on_swap(&params);
    assert!(matches!(result, Err(PoolError::ZeroInvariant)));
}

#[test]
fn reclamm_v1_on_swap_returns_zero_invariant_on_dusty_off_centre_pool() {
    let pool = make_v1_pool();
    let params = swap_params(panic_case_balances());
    let result = pool.on_swap(&params);
    assert!(matches!(result, Err(PoolError::ZeroInvariant)));
}

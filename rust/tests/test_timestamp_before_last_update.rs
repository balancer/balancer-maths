//! Regression: quoting before a pool's last update must return PoolError, not panic.

use alloy_primitives::{I256, U256};
use balancer_maths_rust::common::types::{BasePoolState, SwapKind, SwapParams};
use balancer_maths_rust::pools::quantamm::{
    QuantAmmImmutable, QuantAmmMutable, QuantAmmPool, QuantAmmState,
};
use balancer_maths_rust::pools::reclamm::{
    ReClammImmutable, ReClammMutable, ReClammPool, ReClammState,
};
use balancer_maths_rust::pools::reclammv2::{
    ReClammV2Immutable, ReClammV2Mutable, ReClammV2Pool, ReClammV2State,
};
use balancer_maths_rust::{PoolBase, PoolError};

const WAD: U256 = U256::from_limbs([1_000_000_000_000_000_000, 0, 0, 0]);
const HALF_WAD: U256 = U256::from_limbs([500_000_000_000_000_000, 0, 0, 0]);

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

/// Off-centre but non-dusty: centeredness < margin, invariant non-zero so the
/// price-range path reaches the duration subtraction.
fn off_centre_balances() -> Vec<U256> {
    Vec::from([WAD, WAD / U256::from(10u64)])
}

fn off_centre_virtuals() -> Vec<U256> {
    Vec::from([WAD, WAD])
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
fn quantamm_new_returns_error_when_timestamp_before_last_update() {
    let balances = vec![WAD, WAD];
    // Packed [w0, w1, m0, m1] for a 2-token pool.
    let weights_and_multipliers = vec![
        I256::from_raw(HALF_WAD),
        I256::from_raw(HALF_WAD),
        I256::ZERO,
        I256::ZERO,
    ];
    let state = QuantAmmState {
        base: base_state(balances, "QUANT_AMM"),
        mutable: QuantAmmMutable {
            first_four_weights_and_multipliers: weights_and_multipliers,
            second_four_weights_and_multipliers: vec![],
            last_update_time: U256::from(200u64),
            last_interop_time: U256::from(300u64),
            // Quoting a block earlier than the last weight update.
            current_timestamp: U256::from(100u64),
        },
        immutable: QuantAmmImmutable {
            max_trade_size_ratio: HALF_WAD,
        },
    };

    let result = QuantAmmPool::new(state);
    assert!(matches!(result, Err(PoolError::TimestampBeforeLastUpdate)));
}

#[test]
fn reclamm_v2_on_swap_returns_error_when_timestamp_before_last_update() {
    let balances = off_centre_balances();
    let state = ReClammV2State {
        base: base_state(balances.clone(), "RECLAMM_V2"),
        mutable: ReClammV2Mutable {
            last_virtual_balances: off_centre_virtuals(),
            daily_price_shift_base: WAD,
            last_timestamp: U256::from(200u64),
            current_timestamp: U256::from(100u64),
            centeredness_margin: WAD / U256::from(2u64),
            start_fourth_root_price_ratio: WAD,
            end_fourth_root_price_ratio: WAD,
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
    let pool = ReClammV2Pool::new(state);
    let result = pool.on_swap(&swap_params(balances));
    assert!(matches!(result, Err(PoolError::TimestampBeforeLastUpdate)));
}

#[test]
fn reclamm_v1_on_swap_returns_error_when_timestamp_before_last_update() {
    let balances = off_centre_balances();
    let state = ReClammState {
        base: base_state(balances.clone(), "RECLAMM"),
        mutable: ReClammMutable {
            last_virtual_balances: off_centre_virtuals(),
            daily_price_shift_base: WAD,
            last_timestamp: U256::from(200u64),
            current_timestamp: U256::from(100u64),
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
    let pool = ReClammPool::new(state);
    let result = pool.on_swap(&swap_params(balances));
    assert!(matches!(result, Err(PoolError::TimestampBeforeLastUpdate)));
}

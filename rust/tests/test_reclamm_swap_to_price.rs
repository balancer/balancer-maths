use alloy_primitives::U256;
use balancer_maths_rust::common::types::{
    BasePoolState, PoolState, PoolStateOrBuffer, SwapInput, SwapKind,
};
use balancer_maths_rust::pools::reclamm::{
    calculate_reclamm_price, swap_reclamm_to_price, ReClammImmutable, ReClammMutable, ReClammState,
    SwapToTargetPriceResult,
};
use balancer_maths_rust::vault::Vault;
use std::str::FromStr;

/// Single source of truth for test pool data
struct TestPool {
    // Token information
    tokens: Vec<String>,
    token_rates: Vec<U256>,

    // Pool balances
    balances_live_scaled_18: Vec<U256>,
    current_virtual_balances: Vec<U256>,
    last_virtual_balances: Vec<U256>,

    // Fee information
    swap_fee_percentage: U256,
    protocol_fee_percentage: U256,
    pool_creator_fee_percentage: U256,
    aggregate_swap_fee: U256,

    // Pool metadata
    pool_address: String,
    pool_type: String,
    scaling_factors: Vec<U256>,
    total_supply: U256,
    supports_unbalanced_liquidity: bool,

    // ReClamm mutable state
    daily_price_shift_base: U256,
    last_timestamp: U256,
    current_timestamp: U256,
    centeredness_margin: U256,
    start_fourth_root_price_ratio: U256,
    end_fourth_root_price_ratio: U256,
    price_ratio_update_start_time: U256,
    price_ratio_update_end_time: U256,
}

impl TestPool {
    fn new() -> Self {
        // @ block 23770135
        // Dynamic: https://www.tdly.co/shared/simulation/69df26bd-13b5-4b03-ac9e-5621e846f272
        // Immutable: https://www.tdly.co/shared/simulation/a30373ac-14c6-4a80-a7ea-8fb265a9c094
        // computeCurrentVirtualBalances: https://www.tdly.co/shared/simulation/f1e1d424-7d7f-4586-bdcb-9250747a4e3b
        // poolConfig: https://www.tdly.co/shared/simulation/cd9b6921-f4b6-4767-bfed-d15128f1974e
        Self {
            tokens: vec![
                "0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9".to_string(),
                "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2".to_string(),
            ],
            token_rates: vec![
                U256::from_str_radix("1000000000000000000", 10).unwrap(),
                U256::from_str_radix("1000000000000000000", 10).unwrap(),
            ],
            balances_live_scaled_18: vec![
                U256::from_str_radix("122255177411753308470", 10).unwrap(),
                U256::from_str_radix("13599963412925271409", 10).unwrap(),
            ],
            current_virtual_balances: vec![
                U256::from_str_radix("1625276236369015815176", 10).unwrap(),
                U256::from_str_radix("94519978983150350207", 10).unwrap(),
            ],
            last_virtual_balances: vec![
                U256::from_str_radix("1625276236369015815176", 10).unwrap(),
                U256::from_str_radix("94519978983150350207", 10).unwrap(),
            ],
            swap_fee_percentage: U256::from_str_radix("2500000000000000", 10).unwrap(),
            protocol_fee_percentage: U256::from_str_radix("500000000000000000", 10).unwrap(),
            pool_creator_fee_percentage: U256::ZERO,
            aggregate_swap_fee: U256::from_str("500000000000000000").unwrap(),
            pool_address: "0x9d1fcf346ea1b073de4d5834e25572cc6ad71f4d".to_string(),
            pool_type: "RECLAMM".to_string(),
            scaling_factors: vec![U256::from(1), U256::from(1)],
            total_supply: U256::from_str("70770040290965574288").unwrap(),
            supports_unbalanced_liquidity: false,
            daily_price_shift_base: U256::from_str("999999197747274347").unwrap(),
            last_timestamp: U256::from(1762792907),
            current_timestamp: U256::from(1762793123),
            centeredness_margin: U256::from_str("500000000000000000").unwrap(),
            start_fourth_root_price_ratio: U256::from_str("1106685929012132905").unwrap(),
            end_fourth_root_price_ratio: U256::from_str("1106685929012132905").unwrap(),
            price_ratio_update_start_time: U256::from(1754001203),
            price_ratio_update_end_time: U256::from(1754001203),
        }
    }
}

// Helper to create PoolStateOrBuffer from test pool data
fn create_pool_state_or_buffer(test_pool: &TestPool) -> PoolStateOrBuffer {
    let base_pool_state = BasePoolState {
        pool_address: test_pool.pool_address.clone(),
        pool_type: test_pool.pool_type.clone(),
        tokens: test_pool.tokens.clone(),
        scaling_factors: test_pool.scaling_factors.clone(),
        token_rates: test_pool.token_rates.clone(),
        balances_live_scaled_18: test_pool.balances_live_scaled_18.clone(),
        swap_fee: test_pool.swap_fee_percentage,
        aggregate_swap_fee: test_pool.aggregate_swap_fee,
        total_supply: test_pool.total_supply,
        supports_unbalanced_liquidity: test_pool.supports_unbalanced_liquidity,
        hook_type: None,
    };

    let re_clamm_mutable = ReClammMutable {
        last_virtual_balances: test_pool.last_virtual_balances.clone(),
        daily_price_shift_base: test_pool.daily_price_shift_base,
        last_timestamp: test_pool.last_timestamp,
        current_timestamp: test_pool.current_timestamp,
        centeredness_margin: test_pool.centeredness_margin,
        start_fourth_root_price_ratio: test_pool.start_fourth_root_price_ratio,
        end_fourth_root_price_ratio: test_pool.end_fourth_root_price_ratio,
        price_ratio_update_start_time: test_pool.price_ratio_update_start_time,
        price_ratio_update_end_time: test_pool.price_ratio_update_end_time,
    };

    let re_clamm_immutable = ReClammImmutable {
        pool_address: test_pool.pool_address.clone(),
        tokens: test_pool.tokens.clone(),
    };

    let re_clamm_state = ReClammState {
        base: base_pool_state,
        mutable: re_clamm_mutable,
        immutable: re_clamm_immutable,
    };

    PoolStateOrBuffer::Pool(Box::new(PoolState::ReClamm(re_clamm_state)))
}

// Helper to get token addresses from pool state based on swap result indices
fn get_swap_tokens(
    pool_state_or_buffer: &PoolStateOrBuffer,
    price_result: &SwapToTargetPriceResult,
) -> (String, String) {
    let tokens = match pool_state_or_buffer {
        PoolStateOrBuffer::Pool(pool_state) => match pool_state.as_ref() {
            PoolState::ReClamm(re_clamm_state) => &re_clamm_state.base.tokens,
            _ => panic!("Expected ReClamm pool state"),
        },
        PoolStateOrBuffer::Buffer(_) => panic!("Expected Pool state, not Buffer"),
    };

    let token_in = tokens[price_result.token_in_index].clone();
    let token_out = tokens[price_result.token_out_index].clone();

    (token_in, token_out)
}

// Helper to apply swap to balances
fn update_balances(
    balances: &mut [U256],
    scaling_factors: &[U256],
    token_in_index: usize,
    token_out_index: usize,
    amount_in_raw: U256,
    amount_out_raw: U256,
) {
    let amount_in_scaled = amount_in_raw * scaling_factors[token_in_index];
    let amount_out_scaled = amount_out_raw * scaling_factors[token_out_index];

    balances[token_in_index] += amount_in_scaled;
    balances[token_out_index] -= amount_out_scaled;
}

// Helper to check if two U256 values are within tolerance (0.01%)
fn u256_equal_within_tolerance(actual: U256, expected: U256) -> bool {
    let diff = if actual > expected {
        actual - expected
    } else {
        expected - actual
    };
    let tolerance = expected / U256::from(10000u128); // 0.01%
    diff <= tolerance
}

// Macro to generate similar tests for different price multipliers
macro_rules! generate_tests {
    ($multiplier:expr, $suffix:ident) => {
        paste::paste! {
            #[test]
            fn [<test_price_accuracy_ $suffix>]() {
                let test_pool = TestPool::new();
                let mut balances_live_scaled_18 = test_pool.balances_live_scaled_18.clone();

                let current_price_scaled_18 = calculate_reclamm_price(&balances_live_scaled_18, &test_pool.current_virtual_balances);
                let target_price_scaled_18 = current_price_scaled_18 * U256::from($multiplier * 1e18) / U256::from(1e18);

                let result = swap_reclamm_to_price(
                    &test_pool.token_rates,
                    &test_pool.scaling_factors,
                    &balances_live_scaled_18,
                    &test_pool.current_virtual_balances,
                    &test_pool.swap_fee_percentage,
                    &test_pool.protocol_fee_percentage,
                    &test_pool.pool_creator_fee_percentage,
                    &target_price_scaled_18,
                )
                .unwrap();

                update_balances(
                    &mut balances_live_scaled_18,
                    &test_pool.scaling_factors,
                    result.token_in_index,
                    result.token_out_index,
                    result.amount_in_raw,
                    result.amount_out_raw,
                );

                let new_price_scaled_18 = calculate_reclamm_price(&balances_live_scaled_18, &test_pool.current_virtual_balances);

                assert!(
                    u256_equal_within_tolerance(new_price_scaled_18, target_price_scaled_18),
                    "New price {} should equal target price {}",
                    new_price_scaled_18,
                    target_price_scaled_18
                );
            }

            #[test]
            fn [<test_amount_validation_ $suffix>]() {
                let test_pool = TestPool::new();

                let current_price_scaled_18 = calculate_reclamm_price(&test_pool.balances_live_scaled_18, &test_pool.current_virtual_balances);
                let target_price_scaled_18 = current_price_scaled_18 * U256::from($multiplier * 1e18) / U256::from(1e18);

                let price_result = swap_reclamm_to_price(
                    &test_pool.token_rates,
                    &test_pool.scaling_factors,
                    &test_pool.balances_live_scaled_18,
                    &test_pool.current_virtual_balances,
                    &test_pool.swap_fee_percentage,
                    &test_pool.protocol_fee_percentage,
                    &test_pool.pool_creator_fee_percentage,
                    &target_price_scaled_18
                )
                .unwrap();

                // Create pool state for vault.swap
                let pool_state_or_buffer = create_pool_state_or_buffer(&test_pool);

                // Create swap input
                let (token_in, token_out) = get_swap_tokens(&pool_state_or_buffer, &price_result);

                let swap_input = SwapInput {
                    amount_raw: price_result.amount_in_raw,
                    token_in,
                    token_out,
                    swap_kind: SwapKind::GivenIn,
                };

                // Perform swap using vault
                let vault = Vault::new();
                let computed_out_raw = vault
                    .swap(&swap_input, &pool_state_or_buffer, None)
                    .expect("Swap failed");

                assert!(
                    u256_equal_within_tolerance(computed_out_raw, price_result.amount_out_raw),
                    "Computed amount out {} should match result amount out {} within tolerance",
                    computed_out_raw,
                    price_result.amount_out_raw
                );
            }
        }
    };
}
// Generate tests for price multipliers
generate_tests!(0.95, x095);
generate_tests!(0.96, x096);
generate_tests!(0.97, x097);
generate_tests!(0.98, x098);
generate_tests!(0.99, x099);
generate_tests!(1.0, x100);
generate_tests!(1.01, x101);
generate_tests!(1.02, x102);
generate_tests!(1.03, x103);
generate_tests!(1.04, x104);
generate_tests!(1.05, x105);

#[test]
fn test_amount_out_exceeds_balance_greater() {
    let test_pool = TestPool::new();

    let current_price_scaled_18 = calculate_reclamm_price(
        &test_pool.balances_live_scaled_18,
        &test_pool.current_virtual_balances,
    );
    // Target price 90% greater than current price
    let target_price_scaled_18 =
        current_price_scaled_18 * U256::from(1.9 * 1e18) / U256::from(1e18);

    let result = swap_reclamm_to_price(
        &test_pool.token_rates,
        &test_pool.scaling_factors,
        &test_pool.balances_live_scaled_18,
        &test_pool.current_virtual_balances,
        &test_pool.swap_fee_percentage,
        &test_pool.protocol_fee_percentage,
        &test_pool.pool_creator_fee_percentage,
        &target_price_scaled_18,
    );

    assert!(
        result.is_err(),
        "Expected error for 90% greater price, but got result: {:?}",
        result
    );

    let error_msg = result.unwrap_err();
    assert!(
        error_msg.contains("amount out exceeds balance"),
        "Expected 'amount out exceeds balance' error, but got: {}",
        error_msg
    );
}

#[test]
fn test_amount_out_exceeds_balance_less() {
    let test_pool = TestPool::new();

    let current_price_scaled_18 = calculate_reclamm_price(
        &test_pool.balances_live_scaled_18,
        &test_pool.current_virtual_balances,
    );

    // Target price 50% less than current price
    let target_price_scaled_18 =
        current_price_scaled_18 * U256::from(0.5 * 1e18) / U256::from(1e18);

    let result = swap_reclamm_to_price(
        &test_pool.token_rates,
        &test_pool.scaling_factors,
        &test_pool.balances_live_scaled_18,
        &test_pool.current_virtual_balances,
        &test_pool.swap_fee_percentage,
        &test_pool.protocol_fee_percentage,
        &test_pool.pool_creator_fee_percentage,
        &target_price_scaled_18,
    );

    assert!(
        result.is_err(),
        "Expected error for 50% less price, but got result: {:?}",
        result
    );

    let error_msg = result.unwrap_err();
    assert!(
        error_msg.contains("amount out exceeds balance"),
        "Expected 'amount out exceeds balance' error, but got: {}",
        error_msg
    );
}

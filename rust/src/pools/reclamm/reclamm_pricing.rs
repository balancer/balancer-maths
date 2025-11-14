use alloy_primitives::U256;

/// Result struct for swap to target price calculation
#[derive(Debug, Clone)]
pub struct SwapToTargetPriceResult {
    pub token_in_index: usize,
    pub token_out_index: usize,
    pub amount_in_raw: U256,
    pub amount_out_raw: U256,
}

/// Helper function to convert U256 to f64
/// Handles large numbers by converting to string and parsing
fn u256_to_f64(value: &U256) -> f64 {
    // For values that fit in u128, use direct conversion
    if let Ok(val) = u128::try_from(*value) {
        val as f64
    } else {
        // For very large numbers, convert via string
        // This may lose precision but is acceptable for our use case
        value.to_string().parse::<f64>().unwrap_or(f64::MAX)
    }
}

/// Calculate current ReCLAMM price
/// Returns price in e18 format: (balanceB + virtualB) / (balanceA + virtualA)
pub fn calculate_reclamm_price(
    balances_live_scaled_18: &[U256],
    current_virtual_balances: &[U256],
) -> U256 {
    // Convert to f64
    let balance_a = u256_to_f64(&balances_live_scaled_18[0]) / 1e18;
    let balance_b = u256_to_f64(&balances_live_scaled_18[1]) / 1e18;
    let virtual_a = u256_to_f64(&current_virtual_balances[0]) / 1e18;
    let virtual_b = u256_to_f64(&current_virtual_balances[1]) / 1e18;

    // Calculate price
    let price = (balance_b + virtual_b) / (balance_a + virtual_a);

    // Convert back to U256 (scaled to e18)
    let price_scaled = (price * 1e18) as u128;
    U256::from(price_scaled)
}

/// Calculate swap amounts needed to reach a target price in a ReCLAMM pool
///
/// # Arguments
/// * `token_rates` - Token rates from rate providers [rateA, rateB] in e18
/// * `balances_live_scaled_18` - Pool balances [balanceA, balanceB] in e18
/// * `current_virtual_balances` - Virtual balances [virtualA, virtualB] in e18
/// * `swap_fee_percentage` - Swap fee percentage in e18
/// * `protocol_fee_percentage` - Protocol fee percentage in e18
/// * `pool_creator_fee_percentage` - Pool creator fee percentage in e18
/// * `decimals_a` - Decimals for token A
/// * `decimals_b` - Decimals for token B
/// * `target_price_scaled_18` - Target price in e18 format
///
/// # Returns
/// Result containing token indices and raw amounts for the swap
#[allow(clippy::too_many_arguments)]
pub fn swap_reclamm_to_price(
    token_rates: &[U256],
    balances_live_scaled_18: &[U256],
    current_virtual_balances: &[U256],
    swap_fee_percentage: &U256,
    _protocol_fee_percentage: &U256,
    _pool_creator_fee_percentage: &U256,
    decimals_a: u8,
    decimals_b: u8,
    target_price_scaled_18: &U256,
) -> Result<SwapToTargetPriceResult, String> {
    // Input validation
    if balances_live_scaled_18.len() != 2
        || current_virtual_balances.len() != 2
        || token_rates.len() != 2
    {
        return Err("Invalid input: arrays must have length 2".to_string());
    }

    // Convert U256 inputs to f64
    let balance_a = u256_to_f64(&balances_live_scaled_18[0]) / 1e18;
    let balance_b = u256_to_f64(&balances_live_scaled_18[1]) / 1e18;
    let virtual_a = u256_to_f64(&current_virtual_balances[0]) / 1e18;
    let virtual_b = u256_to_f64(&current_virtual_balances[1]) / 1e18;
    let swap_fee = u256_to_f64(swap_fee_percentage) / 1e18;
    // Note: protocol_fee and pool_creator_fee are not used in the calculation
    // They affect fee distribution but not the swap amounts needed to reach target price
    let rate_a = u256_to_f64(&token_rates[0]) / 1e18;
    let rate_b = u256_to_f64(&token_rates[1]) / 1e18;
    let target_price = u256_to_f64(target_price_scaled_18) / 1e18;

    // Validate non-zero values
    if balance_a + virtual_a == 0.0 || balance_b + virtual_b == 0.0 {
        return Err("Invalid pool state: zero total balance".to_string());
    }
    if rate_a == 0.0 || rate_b == 0.0 {
        return Err("Invalid rates: zero rate".to_string());
    }
    if target_price <= 0.0 {
        return Err("Invalid target price: must be positive".to_string());
    }

    // Calculate invariant and prices
    let invariant = (balance_a + virtual_a) * (balance_b + virtual_b);
    let current_price = (balance_b + virtual_b) / (balance_a + virtual_a);
    let target_price_scaled = target_price * rate_a / rate_b;

    if target_price_scaled > current_price {
        // tokenB in, tokenA out
        let amount_out_scaled = balance_a + virtual_a - (invariant / target_price_scaled).sqrt();

        // Calculate amount needed in the invariant math (after swap fee is removed)
        let amount_in_scaled_net =
            (invariant / (balance_a - amount_out_scaled + virtual_a)) - balance_b - virtual_b;

        // Convert to gross amount (before swap fee) - this is what the user provides
        let amount_in_scaled = amount_in_scaled_net / (1.0 - swap_fee);

        // Validate amounts
        if amount_out_scaled < 0.0 || amount_in_scaled < 0.0 {
            return Err("Invalid calculation: negative amounts".to_string());
        }
        if amount_out_scaled > balance_a {
            return Err("Invalid calculation: amount out exceeds balance".to_string());
        }

        Ok(SwapToTargetPriceResult {
            token_in_index: 1,
            token_out_index: 0,
            amount_in_raw: U256::from(
                (amount_in_scaled * 10f64.powi(decimals_b as i32) / rate_b).ceil() as u128,
            ),
            amount_out_raw: U256::from(
                (amount_out_scaled * 10f64.powi(decimals_a as i32) / rate_a).floor() as u128,
            ),
        })
    } else {
        // tokenA in, tokenB out
        let amount_out_scaled = balance_b + virtual_b - (invariant * target_price_scaled).sqrt();

        // Calculate amount needed in the invariant math (after swap fee is removed)
        let amount_in_scaled_net =
            (invariant / (balance_b - amount_out_scaled + virtual_b)) - balance_a - virtual_a;

        // Convert to gross amount (before swap fee) - this is what the user provides
        let amount_in_scaled = amount_in_scaled_net / (1.0 - swap_fee);

        // Validate amounts
        if amount_out_scaled < 0.0 || amount_in_scaled < 0.0 {
            return Err("Invalid calculation: negative amounts".to_string());
        }
        if amount_out_scaled > balance_b {
            return Err("Invalid calculation: amount out exceeds balance".to_string());
        }

        Ok(SwapToTargetPriceResult {
            token_in_index: 0,
            token_out_index: 1,
            amount_in_raw: U256::from(
                (amount_in_scaled * 10f64.powi(decimals_a as i32) / rate_a).ceil() as u128,
            ),
            amount_out_raw: U256::from(
                (amount_out_scaled * 10f64.powi(decimals_b as i32) / rate_b).floor() as u128,
            ),
        })
    }
}

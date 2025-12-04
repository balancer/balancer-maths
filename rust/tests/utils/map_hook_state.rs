//! Maps hook data from JSON test files into typed HookState objects

use alloy_primitives::U256;
use balancer_maths_rust::hooks::types::HookState;
use balancer_maths_rust::hooks::{AkronHookState, ExitFeeHookState, StableSurgeHookState};

use super::read_test_data::HookData;

/// Pool data needed for hook state mapping
pub struct PoolData {
    pub tokens: Vec<String>,
    pub amp: Option<U256>,
    pub weights: Option<Vec<U256>>,
    pub swap_fee: U256,
}

/// Maps hook data from JSON test files into typed HookState objects
/// that can be used with hook implementations
pub fn map_hook_state(
    hook_data: &HookData,
    pool_data: &PoolData,
) -> Result<HookState, Box<dyn std::error::Error>> {
    match hook_data.hook_type.as_str() {
        "EXIT_FEE" => map_exit_fee_hook_state(hook_data, &pool_data.tokens),
        "STABLE_SURGE" => map_stable_surge_hook_state(hook_data, pool_data),
        "AKRON" => map_akron_hook_state(hook_data, pool_data),
        _ => Err(format!("Unsupported hook type: {}", hook_data.hook_type).into()),
    }
}

fn map_exit_fee_hook_state(
    hook_data: &HookData,
    tokens: &[String],
) -> Result<HookState, Box<dyn std::error::Error>> {
    let dynamic_data = &hook_data.dynamic_data;
    let remove_liquidity_hook_fee_percentage = dynamic_data["removeLiquidityHookFeePercentage"]
        .as_str()
        .ok_or("EXIT_FEE hook requires removeLiquidityHookFeePercentage in dynamicData")?
        .parse::<U256>()?;

    Ok(HookState::ExitFee(ExitFeeHookState {
        hook_type: "ExitFee".to_string(),
        tokens: tokens.to_vec(),
        remove_liquidity_hook_fee_percentage,
    }))
}

fn map_stable_surge_hook_state(
    hook_data: &HookData,
    pool_data: &PoolData,
) -> Result<HookState, Box<dyn std::error::Error>> {
    let dynamic_data = &hook_data.dynamic_data;

    let surge_threshold_percentage = dynamic_data["surgeThresholdPercentage"]
        .as_str()
        .ok_or("STABLE_SURGE hook requires surgeThresholdPercentage in dynamicData")?
        .parse::<U256>()?;

    let max_surge_fee_percentage = dynamic_data["maxSurgeFeePercentage"]
        .as_str()
        .ok_or("STABLE_SURGE hook requires maxSurgeFeePercentage in dynamicData")?
        .parse::<U256>()?;

    let amp = pool_data
        .amp
        .ok_or("STABLE_SURGE hook requires amp from pool data")?;

    Ok(HookState::StableSurge(StableSurgeHookState {
        hook_type: "StableSurge".to_string(),
        amp,
        surge_threshold_percentage,
        max_surge_fee_percentage,
    }))
}

fn map_akron_hook_state(
    _hook_data: &HookData,
    pool_data: &PoolData,
) -> Result<HookState, Box<dyn std::error::Error>> {
    let weights = pool_data
        .weights
        .as_ref()
        .ok_or("AKRON hook requires weights from pool data")?
        .clone();

    let minimum_swap_fee_percentage = pool_data.swap_fee;

    Ok(HookState::Akron(AkronHookState {
        hook_type: "Akron".to_string(),
        weights,
        minimum_swap_fee_percentage,
    }))
}

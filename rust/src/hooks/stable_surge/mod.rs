//! Stable surge hook implementation

use crate::common::errors::PoolError;
use crate::common::maths::{complement_fixed, div_down_fixed, mul_down_fixed};
use crate::common::pool_base::PoolBase;
use crate::common::types::SwapKind::GivenIn;
use crate::common::types::{AddLiquidityKind, HookStateBase, RemoveLiquidityKind, SwapParams};
use crate::hooks::types::{
    AfterAddLiquidityResult, AfterRemoveLiquidityResult, AfterSwapParams, AfterSwapResult,
    BeforeAddLiquidityResult, BeforeRemoveLiquidityResult, BeforeSwapResult, DynamicSwapFeeResult,
    HookState,
};
use crate::hooks::{DefaultHook, HookBase, HookConfig};
use crate::pools::stable::stable_data::StableMutable;
use crate::pools::stable::StablePool;
use num_bigint::BigInt;
use num_traits::Zero;
use serde::{Deserialize, Serialize};

/// Stable surge hook state
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct StableSurgeHookState {
    /// Hook type
    pub hook_type: String,
    /// Amplification parameter
    pub amp: BigInt,
    /// Surge threshold percentage (scaled 18)
    pub surge_threshold_percentage: BigInt,
    /// Maximum surge fee percentage (scaled 18)
    pub max_surge_fee_percentage: BigInt,
}

impl HookStateBase for StableSurgeHookState {
    fn hook_type(&self) -> &str {
        &self.hook_type
    }
}

impl Default for StableSurgeHookState {
    fn default() -> Self {
        Self {
            hook_type: "StableSurge".to_string(),
            amp: BigInt::zero(),
            surge_threshold_percentage: BigInt::zero(),
            max_surge_fee_percentage: BigInt::zero(),
        }
    }
}

/// Stable surge hook implementation
/// This hook implements the StableSurgeHook found in mono-repo: https://github.com/balancer/balancer-v3-monorepo/blob/main/pkg/pool-hooks/contracts/StableSurgeHook.sol
pub struct StableSurgeHook {
    config: HookConfig,
}

impl StableSurgeHook {
    pub fn new() -> Self {
        let config = HookConfig {
            should_call_compute_dynamic_swap_fee: true,
            should_call_after_add_liquidity: true,
            should_call_after_remove_liquidity: true,
            ..Default::default()
        };

        Self { config }
    }

    /// Get surge fee percentage based on imbalance
    fn get_surge_fee_percentage(
        &self,
        swap_params: &SwapParams,
        surge_threshold_percentage: &BigInt,
        max_surge_fee_percentage: &BigInt,
        static_fee_percentage: &BigInt,
        hook_state: &StableSurgeHookState,
    ) -> Result<BigInt, PoolError> {
        // Create a temporary stable pool for swap simulation
        let stable_state = StableMutable {
            amp: hook_state.amp.clone(),
        };
        let stable_pool = StablePool::new(stable_state);

        // Simulate the swap to get the calculated amount
        let amount_calculated_scaled_18 = stable_pool.on_swap(swap_params)?;
        let mut new_balances = swap_params.balances_live_scaled_18.clone();

        // Update balances based on swap kind
        if swap_params.swap_kind == GivenIn {
            new_balances[swap_params.token_in_index] =
                &new_balances[swap_params.token_in_index] + &swap_params.amount_scaled_18;
            new_balances[swap_params.token_out_index] =
                &new_balances[swap_params.token_out_index] - &amount_calculated_scaled_18;
        } else {
            new_balances[swap_params.token_in_index] =
                &new_balances[swap_params.token_in_index] + &amount_calculated_scaled_18;
            new_balances[swap_params.token_out_index] =
                &new_balances[swap_params.token_out_index] - &swap_params.amount_scaled_18;
        }

        let new_total_imbalance = self.calculate_imbalance(&new_balances)?;

        // If we are balanced, return the static fee percentage
        if new_total_imbalance.is_zero() {
            return Ok(static_fee_percentage.clone());
        }

        let old_total_imbalance = self.calculate_imbalance(&swap_params.balances_live_scaled_18)?;

        // If the balance has improved or is within threshold, return static fee
        if new_total_imbalance <= old_total_imbalance
            || new_total_imbalance <= *surge_threshold_percentage
        {
            return Ok(static_fee_percentage.clone());
        }

        // Calculate dynamic surge fee
        // surgeFee = staticFee + (maxFee - staticFee) * (pctImbalance - pctThreshold) / (1 - pctThreshold)
        let fee_difference = max_surge_fee_percentage - static_fee_percentage;
        let imbalance_excess = &new_total_imbalance - surge_threshold_percentage;
        let threshold_complement = complement_fixed(surge_threshold_percentage)?;

        let surge_multiplier = div_down_fixed(&imbalance_excess, &threshold_complement)?;
        let dynamic_fee_increase = mul_down_fixed(&fee_difference, &surge_multiplier)?;

        Ok(static_fee_percentage + dynamic_fee_increase)
    }

    /// Calculate imbalance percentage for a list of balances
    fn calculate_imbalance(&self, balances: &[BigInt]) -> Result<BigInt, PoolError> {
        let median = self.find_median(balances);

        let total_balance: BigInt = balances.iter().sum();
        let total_diff: BigInt = balances
            .iter()
            .map(|balance| self.abs_sub(balance, &median))
            .sum();

        div_down_fixed(&total_diff, &total_balance)
    }

    /// Find the median of a list of BigInts
    fn find_median(&self, balances: &[BigInt]) -> BigInt {
        let mut sorted_balances = balances.to_vec();
        sorted_balances.sort();
        let mid = sorted_balances.len() / 2;

        if sorted_balances.len() % 2 == 0 {
            (&sorted_balances[mid - 1] + &sorted_balances[mid]) / 2
        } else {
            sorted_balances[mid].clone()
        }
    }

    /// Calculate absolute difference between two BigInts
    fn abs_sub(&self, a: &BigInt, b: &BigInt) -> BigInt {
        if a > b {
            a - b
        } else {
            b - a
        }
    }

    /// Determine if the pool is surging based on threshold percentage, current balances, and new total imbalance
    fn is_surging(
        &self,
        threshold_percentage: &BigInt,
        current_balances: &[BigInt],
        new_total_imbalance: &BigInt,
    ) -> Result<bool, PoolError> {
        // If we are balanced, or the balance has improved, do not surge: simply return False
        if new_total_imbalance.is_zero() {
            return Ok(false);
        }

        let old_total_imbalance = self.calculate_imbalance(current_balances)?;

        // Surging if imbalance grows and we're currently above the threshold
        Ok(
            new_total_imbalance > &old_total_imbalance
                && new_total_imbalance > threshold_percentage,
        )
    }
}

impl HookBase for StableSurgeHook {
    fn hook_type(&self) -> &str {
        "StableSurge"
    }

    fn config(&self) -> &HookConfig {
        &self.config
    }

    fn on_compute_dynamic_swap_fee(
        &self,
        swap_params: &SwapParams,
        static_swap_fee_percentage: &BigInt,
        hook_state: &HookState,
    ) -> DynamicSwapFeeResult {
        match hook_state {
            HookState::StableSurge(state) => {
                match self.get_surge_fee_percentage(
                    swap_params,
                    &state.surge_threshold_percentage,
                    &state.max_surge_fee_percentage,
                    static_swap_fee_percentage,
                    state,
                ) {
                    Ok(dynamic_swap_fee) => DynamicSwapFeeResult {
                        success: true,
                        dynamic_swap_fee,
                    },
                    Err(_) => DynamicSwapFeeResult {
                        success: false,
                        dynamic_swap_fee: static_swap_fee_percentage.clone(),
                    },
                }
            }
            _ => DynamicSwapFeeResult {
                success: false,
                dynamic_swap_fee: static_swap_fee_percentage.clone(),
            },
        }
    }

    // Delegate all other methods to DefaultHook
    fn on_before_add_liquidity(
        &self,
        kind: AddLiquidityKind,
        max_amounts_in_scaled_18: &[BigInt],
        min_bpt_amount_out: &BigInt,
        balances_scaled_18: &[BigInt],
        hook_state: &HookState,
    ) -> BeforeAddLiquidityResult {
        DefaultHook::new().on_before_add_liquidity(
            kind,
            max_amounts_in_scaled_18,
            min_bpt_amount_out,
            balances_scaled_18,
            hook_state,
        )
    }

    fn on_after_add_liquidity(
        &self,
        kind: AddLiquidityKind,
        amounts_in_scaled_18: &[BigInt],
        amounts_in_raw: &[BigInt],
        bpt_amount_out: &BigInt,
        balances_scaled_18: &[BigInt],
        hook_state: &HookState,
    ) -> AfterAddLiquidityResult {
        match hook_state {
            HookState::StableSurge(state) => {
                // Rebuild old balances before adding liquidity
                let mut old_balances_scaled_18 = vec![BigInt::zero(); balances_scaled_18.len()];
                for i in 0..balances_scaled_18.len() {
                    old_balances_scaled_18[i] = &balances_scaled_18[i] - &amounts_in_scaled_18[i];
                }

                let new_total_imbalance = match self.calculate_imbalance(balances_scaled_18) {
                    Ok(imbalance) => imbalance,
                    Err(_) => {
                        return AfterAddLiquidityResult {
                            success: false,
                            hook_adjusted_amounts_in_raw: amounts_in_raw.to_vec(),
                        }
                    }
                };

                let is_surging = match self.is_surging(
                    &state.surge_threshold_percentage,
                    &old_balances_scaled_18,
                    &new_total_imbalance,
                ) {
                    Ok(surging) => surging,
                    Err(_) => {
                        return AfterAddLiquidityResult {
                            success: false,
                            hook_adjusted_amounts_in_raw: amounts_in_raw.to_vec(),
                        }
                    }
                };

                // If we're not surging, it's fine to proceed; otherwise halt execution by returning false
                AfterAddLiquidityResult {
                    success: !is_surging,
                    hook_adjusted_amounts_in_raw: amounts_in_raw.to_vec(),
                }
            }
            _ => AfterAddLiquidityResult {
                success: false,
                hook_adjusted_amounts_in_raw: amounts_in_raw.to_vec(),
            },
        }
    }

    fn on_before_remove_liquidity(
        &self,
        kind: RemoveLiquidityKind,
        max_bpt_amount_in: &BigInt,
        min_amounts_out_scaled_18: &[BigInt],
        balances_scaled_18: &[BigInt],
        hook_state: &HookState,
    ) -> BeforeRemoveLiquidityResult {
        DefaultHook::new().on_before_remove_liquidity(
            kind,
            max_bpt_amount_in,
            min_amounts_out_scaled_18,
            balances_scaled_18,
            hook_state,
        )
    }

    fn on_after_remove_liquidity(
        &self,
        kind: RemoveLiquidityKind,
        bpt_amount_in: &BigInt,
        amounts_out_scaled_18: &[BigInt],
        amounts_out_raw: &[BigInt],
        balances_scaled_18: &[BigInt],
        hook_state: &HookState,
    ) -> AfterRemoveLiquidityResult {
        match hook_state {
            HookState::StableSurge(state) => {
                // Proportional remove is always fine
                if kind == RemoveLiquidityKind::Proportional {
                    return AfterRemoveLiquidityResult {
                        success: true,
                        hook_adjusted_amounts_out_raw: amounts_out_raw.to_vec(),
                    };
                }

                // Rebuild old balances before removing liquidity
                let mut old_balances_scaled_18 = vec![BigInt::zero(); balances_scaled_18.len()];
                for i in 0..balances_scaled_18.len() {
                    old_balances_scaled_18[i] = &balances_scaled_18[i] + &amounts_out_scaled_18[i];
                }

                let new_total_imbalance = match self.calculate_imbalance(balances_scaled_18) {
                    Ok(imbalance) => imbalance,
                    Err(_) => {
                        return AfterRemoveLiquidityResult {
                            success: false,
                            hook_adjusted_amounts_out_raw: amounts_out_raw.to_vec(),
                        }
                    }
                };

                let is_surging = match self.is_surging(
                    &state.surge_threshold_percentage,
                    &old_balances_scaled_18,
                    &new_total_imbalance,
                ) {
                    Ok(surging) => surging,
                    Err(_) => {
                        return AfterRemoveLiquidityResult {
                            success: false,
                            hook_adjusted_amounts_out_raw: amounts_out_raw.to_vec(),
                        }
                    }
                };

                // If we're not surging, it's fine to proceed; otherwise halt execution by returning false
                AfterRemoveLiquidityResult {
                    success: !is_surging,
                    hook_adjusted_amounts_out_raw: amounts_out_raw.to_vec(),
                }
            }
            _ => AfterRemoveLiquidityResult {
                success: false,
                hook_adjusted_amounts_out_raw: amounts_out_raw.to_vec(),
            },
        }
    }

    fn on_before_swap(&self, swap_params: &SwapParams, hook_state: &HookState) -> BeforeSwapResult {
        DefaultHook::new().on_before_swap(swap_params, hook_state)
    }

    fn on_after_swap(
        &self,
        after_swap_params: &AfterSwapParams,
        hook_state: &HookState,
    ) -> AfterSwapResult {
        DefaultHook::new().on_after_swap(after_swap_params, hook_state)
    }
}

impl Default for StableSurgeHook {
    fn default() -> Self {
        StableSurgeHook::new()
    }
}

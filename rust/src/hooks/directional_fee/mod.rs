use crate::common::maths::div_down_fixed;
use crate::common::types::HookStateBase;
use crate::hooks::types::{DynamicSwapFeeResult, HookState};
use crate::hooks::{DefaultHook, HookBase, HookConfig};
use num_bigint::BigInt;
use num_traits::Zero;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct DirectionalFeeHookState {
    pub hook_type: String,
}

impl Default for DirectionalFeeHookState {
    fn default() -> Self {
        Self {
            hook_type: "DirectionalFee".to_string(),
        }
    }
}

impl HookStateBase for DirectionalFeeHookState {
    fn hook_type(&self) -> &str {
        &self.hook_type
    }
}

pub struct DirectionalFeeHook {
    config: HookConfig,
}

impl DirectionalFeeHook {
    pub fn new() -> Self {
        let mut config = HookConfig::default();
        config.should_call_compute_dynamic_swap_fee = true;
        Self { config }
    }
}

impl HookBase for DirectionalFeeHook {
    fn hook_type(&self) -> &str {
        "DirectionalFee"
    }
    fn config(&self) -> &HookConfig {
        &self.config
    }

    fn on_compute_dynamic_swap_fee(
        &self,
        swap_params: &crate::common::types::SwapParams,
        static_swap_fee_percentage: &BigInt,
        _hook_state: &HookState,
    ) -> DynamicSwapFeeResult {
        let balance_in = &swap_params.balances_live_scaled_18[swap_params.token_in_index];
        let balance_out = &swap_params.balances_live_scaled_18[swap_params.token_out_index];
        let amount = &swap_params.amount_scaled_18;

        // final balances after gross trade size
        let final_balance_in = balance_in + amount;
        let final_balance_out = balance_out - amount;

        let calculated = if final_balance_in > final_balance_out {
            let diff = &final_balance_in - &final_balance_out;
            let total = final_balance_in + final_balance_out;
            match div_down_fixed(&diff, &total) {
                Ok(v) => v,
                Err(_) => BigInt::zero(),
            }
        } else {
            BigInt::zero()
        };

        let dynamic_swap_fee = if calculated > *static_swap_fee_percentage {
            calculated
        } else {
            static_swap_fee_percentage.clone()
        };

        DynamicSwapFeeResult {
            success: true,
            dynamic_swap_fee,
        }
    }

    // Delegate others to DefaultHook
    fn on_before_add_liquidity(
        &self,
        kind: crate::common::types::AddLiquidityKind,
        max_amounts_in_scaled_18: &[BigInt],
        min_bpt_amount_out: &BigInt,
        balances_scaled_18: &[BigInt],
        hook_state: &HookState,
    ) -> crate::hooks::types::BeforeAddLiquidityResult {
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
        kind: crate::common::types::AddLiquidityKind,
        amounts_in_scaled_18: &[BigInt],
        amounts_in_raw: &[BigInt],
        bpt_amount_out: &BigInt,
        balances_scaled_18: &[BigInt],
        hook_state: &HookState,
    ) -> crate::hooks::types::AfterAddLiquidityResult {
        DefaultHook::new().on_after_add_liquidity(
            kind,
            amounts_in_scaled_18,
            amounts_in_raw,
            bpt_amount_out,
            balances_scaled_18,
            hook_state,
        )
    }
    fn on_before_remove_liquidity(
        &self,
        kind: crate::common::types::RemoveLiquidityKind,
        max_bpt_amount_in: &BigInt,
        min_amounts_out_scaled_18: &[BigInt],
        balances_scaled_18: &[BigInt],
        hook_state: &HookState,
    ) -> crate::hooks::types::BeforeRemoveLiquidityResult {
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
        kind: crate::common::types::RemoveLiquidityKind,
        bpt_amount_in: &BigInt,
        amounts_out_scaled_18: &[BigInt],
        amounts_out_raw: &[BigInt],
        balances_scaled_18: &[BigInt],
        hook_state: &HookState,
    ) -> crate::hooks::types::AfterRemoveLiquidityResult {
        DefaultHook::new().on_after_remove_liquidity(
            kind,
            bpt_amount_in,
            amounts_out_scaled_18,
            amounts_out_raw,
            balances_scaled_18,
            hook_state,
        )
    }
    fn on_before_swap(
        &self,
        swap_params: &crate::common::types::SwapParams,
        hook_state: &HookState,
    ) -> crate::hooks::types::BeforeSwapResult {
        DefaultHook::new().on_before_swap(swap_params, hook_state)
    }
    fn on_after_swap(
        &self,
        after_swap_params: &crate::hooks::types::AfterSwapParams,
        hook_state: &HookState,
    ) -> crate::hooks::types::AfterSwapResult {
        DefaultHook::new().on_after_swap(after_swap_params, hook_state)
    }
}

impl Default for DirectionalFeeHook {
    fn default() -> Self {
        Self::new()
    }
}

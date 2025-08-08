use crate::common::maths::{div_down_fixed, div_up_fixed, mul_div_up_fixed, pow_up_fixed};
use crate::common::types::{HookStateBase, SwapKind};
use crate::hooks::types::{DynamicSwapFeeResult, HookState};
use crate::hooks::{DefaultHook, HookBase, HookConfig};
use num_bigint::BigInt;
use num_traits::Zero;
use serde::{Deserialize, Serialize};

/// Akron hook state
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct AkronHookState {
    /// Hook type
    pub hook_type: String,
    /// Pool weights
    pub weights: Vec<BigInt>,
    /// Minimum swap fee percentage (scaled 18)
    pub minimum_swap_fee_percentage: BigInt,
}

impl HookStateBase for AkronHookState {
    fn hook_type(&self) -> &str {
        &self.hook_type
    }
}

impl Default for AkronHookState {
    fn default() -> Self {
        Self {
            hook_type: "Akron".to_string(),
            weights: vec![],
            minimum_swap_fee_percentage: BigInt::zero(),
        }
    }
}

/// Akron hook implementation
/// This hook implements Loss-Versus-Rebalancing (LVR) fee calculation for weighted pools
pub struct AkronHook {
    config: HookConfig,
}

impl AkronHook {
    pub fn new() -> Self {
        let mut config = HookConfig::default();
        config.should_call_compute_dynamic_swap_fee = true;

        Self { config }
    }

    /// Compute swap fee percentage for GivenIn swaps
    fn compute_swap_fee_percentage_given_exact_in(
        balance_in: &BigInt,
        exponent: &BigInt,
        amount_in: &BigInt,
    ) -> Result<BigInt, crate::common::errors::PoolError> {
        // swap fee is equal to outGivenExactIn(grossAmountIn) - outGivenExactInWithFees(grossAmountIn)
        let balance_plus_amount = balance_in + amount_in;
        let balance_plus_amount_times_2 = balance_in + amount_in * BigInt::from(2);

        let power_with_fees = pow_up_fixed(
            &div_up_fixed(&balance_plus_amount, &balance_plus_amount_times_2)?,
            exponent,
        )?;
        let power_without_fees =
            pow_up_fixed(&div_up_fixed(balance_in, &balance_plus_amount)?, exponent)?;

        let numerator = mul_div_up_fixed(
            &balance_plus_amount,
            &(power_with_fees.clone() - power_without_fees),
            &power_with_fees,
        )?;

        mul_div_up_fixed(exponent, &numerator, amount_in)
    }

    /// Compute swap fee percentage for GivenOut swaps
    fn compute_swap_fee_percentage_given_exact_out(
        balance_out: &BigInt,
        exponent: &BigInt,
        amount_out: &BigInt,
    ) -> Result<BigInt, crate::common::errors::PoolError> {
        // swap fee is equal to inGivenExactOutWithFees(grossAmountIn) - inGivenExactOut(grossAmountIn)
        let balance_minus_amount = balance_out - amount_out;
        let balance_minus_amount_times_2 = balance_out - amount_out * BigInt::from(2);

        let power_with_fees = pow_up_fixed(
            &div_up_fixed(&balance_minus_amount, &balance_minus_amount_times_2)?,
            exponent,
        )?;
        let power_without_fees =
            pow_up_fixed(&div_up_fixed(balance_out, &balance_minus_amount)?, exponent)?;

        let numerator = power_with_fees.clone() - power_without_fees;
        let denominator = power_with_fees.clone() - crate::common::constants::WAD.clone();

        div_up_fixed(&numerator, &denominator)
    }
}

impl HookBase for AkronHook {
    fn hook_type(&self) -> &str {
        "Akron"
    }

    fn config(&self) -> &HookConfig {
        &self.config
    }

    fn on_compute_dynamic_swap_fee(
        &self,
        swap_params: &crate::common::types::SwapParams,
        _static_swap_fee_percentage: &BigInt,
        hook_state: &HookState,
    ) -> DynamicSwapFeeResult {
        match hook_state {
            HookState::Akron(state) => {
                let calculated_swap_fee_percentage = if swap_params.swap_kind == SwapKind::GivenIn {
                    let exponent = div_down_fixed(
                        &state.weights[swap_params.token_in_index],
                        &state.weights[swap_params.token_out_index],
                    )
                    .unwrap_or_else(|_| BigInt::zero());

                    Self::compute_swap_fee_percentage_given_exact_in(
                        &swap_params.balances_live_scaled_18[swap_params.token_in_index],
                        &exponent,
                        &swap_params.amount_scaled_18,
                    )
                    .unwrap_or_else(|_| BigInt::zero())
                } else {
                    let exponent = div_up_fixed(
                        &state.weights[swap_params.token_out_index],
                        &state.weights[swap_params.token_in_index],
                    )
                    .unwrap_or_else(|_| BigInt::zero());

                    Self::compute_swap_fee_percentage_given_exact_out(
                        &swap_params.balances_live_scaled_18[swap_params.token_out_index],
                        &exponent,
                        &swap_params.amount_scaled_18,
                    )
                    .unwrap_or_else(|_| BigInt::zero())
                };

                // Charge the static or calculated fee, whichever is greater
                let dynamic_swap_fee =
                    if state.minimum_swap_fee_percentage > calculated_swap_fee_percentage {
                        state.minimum_swap_fee_percentage.clone()
                    } else {
                        calculated_swap_fee_percentage
                    };

                DynamicSwapFeeResult {
                    success: true,
                    dynamic_swap_fee,
                }
            }
            _ => DynamicSwapFeeResult {
                success: false,
                dynamic_swap_fee: BigInt::zero(),
            },
        }
    }

    // Delegate all other methods to DefaultHook
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

impl Default for AkronHook {
    fn default() -> Self {
        AkronHook::new()
    }
}

//! Exit fee hook implementation

use crate::common::maths::mul_down_fixed;
use crate::common::types::{HookStateBase, RemoveLiquidityKind};
use crate::hooks::types::{AfterRemoveLiquidityResult, HookState};
use crate::hooks::{DefaultHook, HookBase, HookConfig};
use num_bigint::BigInt;
use num_traits::Zero;
use serde::{Deserialize, Serialize};

/// Exit fee hook state
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ExitFeeHookState {
    /// Hook type
    pub hook_type: String,
    /// Token addresses
    pub tokens: Vec<String>,
    /// Remove liquidity hook fee percentage (scaled 18)
    pub remove_liquidity_hook_fee_percentage: BigInt,
}

impl HookStateBase for ExitFeeHookState {
    fn hook_type(&self) -> &str {
        &self.hook_type
    }
}

impl Default for ExitFeeHookState {
    fn default() -> Self {
        Self {
            hook_type: "ExitFee".to_string(),
            tokens: vec![],
            remove_liquidity_hook_fee_percentage: BigInt::zero(),
        }
    }
}

/// Exit fee hook implementation
/// This hook implements the ExitFeeHookExample found in mono-repo: https://github.com/balancer/balancer-v3-monorepo/blob/c848c849cb44dc35f05d15858e4fba9f17e92d5f/pkg/pool-hooks/contracts/ExitFeeHookExample.sol
pub struct ExitFeeHook {
    config: HookConfig,
}

impl ExitFeeHook {
    pub fn new() -> Self {
        let config = HookConfig {
            should_call_after_remove_liquidity: true,
            enable_hook_adjusted_amounts: true,
            ..Default::default()
        };

        Self { config }
    }
}

impl HookBase for ExitFeeHook {
    fn hook_type(&self) -> &str {
        "ExitFee"
    }

    fn config(&self) -> &HookConfig {
        &self.config
    }

    fn on_after_remove_liquidity(
        &self,
        kind: RemoveLiquidityKind,
        _bpt_amount_in: &BigInt,
        _amounts_out_scaled_18: &[BigInt],
        amounts_out_raw: &[BigInt],
        _balances_scaled_18: &[BigInt],
        hook_state: &HookState,
    ) -> AfterRemoveLiquidityResult {
        match hook_state {
            HookState::ExitFee(state) => {
                // Our current architecture only supports fees on tokens. Since we must always respect exact `amountsOut`, and
                // non-proportional remove liquidity operations would require taking fees in BPT, we only support proportional
                // removeLiquidity.
                if kind != RemoveLiquidityKind::Proportional {
                    return AfterRemoveLiquidityResult {
                        success: false,
                        hook_adjusted_amounts_out_raw: amounts_out_raw.to_vec(),
                    };
                }

                let mut accrued_fees = vec![BigInt::zero(); state.tokens.len()];
                let mut hook_adjusted_amounts_out_raw = amounts_out_raw.to_vec();

                if state.remove_liquidity_hook_fee_percentage > BigInt::zero() {
                    // Charge fees proportional to amounts out of each token
                    for i in 0..amounts_out_raw.len() {
                        let hook_fee = mul_down_fixed(
                            &amounts_out_raw[i],
                            &state.remove_liquidity_hook_fee_percentage,
                        )
                        .unwrap_or_else(|_| BigInt::zero());

                        accrued_fees[i] = hook_fee.clone();
                        hook_adjusted_amounts_out_raw[i] =
                            &hook_adjusted_amounts_out_raw[i] - &hook_fee;
                        // Fees don't need to be transferred to the hook, because donation will reinsert them in the vault
                    }

                    // In SC Hook Donates accrued fees back to LPs
                    // _vault.addLiquidity(
                    //     AddLiquidityParams({
                    //         pool: pool,
                    //         to: msg.sender, // It would mint BPTs to router, but it's a donation so no BPT is minted
                    //         maxAmountsIn: accruedFees, // Donate all accrued fees back to the pool (i.e. to the LPs)
                    //         minBptAmountOut: 0, // Donation does not return BPTs, any number above 0 will revert
                    //         kind: AddLiquidityKind.DONATION,
                    //         userData: bytes(''), // User data is not used by donation, so we can set to an empty string
                    //     }),
                    // );
                }

                AfterRemoveLiquidityResult {
                    success: true,
                    hook_adjusted_amounts_out_raw,
                }
            }
            _ => AfterRemoveLiquidityResult {
                success: false,
                hook_adjusted_amounts_out_raw: amounts_out_raw.to_vec(),
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

    fn on_compute_dynamic_swap_fee(
        &self,
        swap_params: &crate::common::types::SwapParams,
        static_swap_fee_percentage: &BigInt,
        hook_state: &HookState,
    ) -> crate::hooks::types::DynamicSwapFeeResult {
        DefaultHook::new().on_compute_dynamic_swap_fee(
            swap_params,
            static_swap_fee_percentage,
            hook_state,
        )
    }
}

impl Default for ExitFeeHook {
    fn default() -> Self {
        ExitFeeHook::new()
    }
}

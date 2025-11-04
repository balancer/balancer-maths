use crate::common::errors::PoolError;
use crate::common::maths::mul_down_fixed;
use crate::common::pool_base::PoolBase;
use crate::common::types::{Rounding, SwapKind, SwapParams};
use crate::pools::stable::stable_data::StableMutable;
use crate::pools::stable::stable_math::{
    compute_balance, compute_in_given_exact_out, compute_invariant, compute_out_given_exact_in,
    _MAX_INVARIANT_RATIO, _MIN_INVARIANT_RATIO,
};
use alloy_primitives::U256;

/// Stable pool implementation
pub struct StablePool {
    pub amp: U256,
}

impl StablePool {
    /// Create a new stable pool
    pub fn new(pool_state: StableMutable) -> Self {
        Self {
            amp: pool_state.amp,
        }
    }
}

impl PoolBase for StablePool {
    fn get_maximum_invariant_ratio(&self) -> U256 {
        U256::from(_MAX_INVARIANT_RATIO)
    }

    fn get_minimum_invariant_ratio(&self) -> U256 {
        U256::from(_MIN_INVARIANT_RATIO)
    }

    fn on_swap(&self, swap_params: &SwapParams) -> Result<U256, PoolError> {
        let invariant = compute_invariant(&self.amp, &swap_params.balances_live_scaled_18)?;

        let result = match swap_params.swap_kind {
            SwapKind::GivenIn => compute_out_given_exact_in(
                &self.amp,
                &swap_params.balances_live_scaled_18,
                swap_params.token_in_index,
                swap_params.token_out_index,
                &swap_params.amount_scaled_18,
                &invariant,
            )?,
            SwapKind::GivenOut => compute_in_given_exact_out(
                &self.amp,
                &swap_params.balances_live_scaled_18,
                swap_params.token_in_index,
                swap_params.token_out_index,
                &swap_params.amount_scaled_18,
                &invariant,
            )?,
        };

        Ok(result)
    }

    fn compute_invariant(
        &self,
        balances_live_scaled18: &[U256],
        rounding: Rounding,
    ) -> Result<U256, PoolError> {
        let mut invariant = compute_invariant(&self.amp, balances_live_scaled18)?;

        if invariant > U256::ZERO {
            match rounding {
                Rounding::RoundDown => {}
                Rounding::RoundUp => {
                    invariant += U256::ONE;
                }
            }
        }

        Ok(invariant)
    }

    fn compute_balance(
        &self,
        balances_live_scaled18: &[U256],
        token_in_index: usize,
        invariant_ratio: &U256,
    ) -> Result<U256, PoolError> {
        let invariant = self.compute_invariant(balances_live_scaled18, Rounding::RoundUp)?;
        let scaled_invariant = mul_down_fixed(&invariant, invariant_ratio)?;

        compute_balance(
            &self.amp,
            balances_live_scaled18,
            &scaled_invariant,
            token_in_index,
        )
    }
}

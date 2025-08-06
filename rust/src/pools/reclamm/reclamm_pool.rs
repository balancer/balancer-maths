use crate::common::errors::PoolError;
use crate::common::pool_base::PoolBase;
use crate::common::types::{Rounding, SwapKind, SwapParams};
use crate::pools::reclamm::reclamm_data::ReClammState;
use crate::pools::reclamm::reclamm_math::{
    compute_current_virtual_balances, compute_in_given_out, compute_out_given_in,
};
use num_bigint::BigInt;
use num_traits::Zero;

/// ReClamm pool implementation
pub struct ReClammPool {
    re_clamm_state: ReClammState,
}

impl ReClammPool {
    /// Create a new ReClamm pool
    pub fn new(pool_state: ReClammState) -> Self {
        Self {
            re_clamm_state: pool_state,
        }
    }

    /// Compute current virtual balances
    fn _compute_current_virtual_balances(
        &self,
        balances_scaled_18: &[BigInt],
    ) -> (BigInt, BigInt, bool) {
        compute_current_virtual_balances(
            &self.re_clamm_state.mutable.current_timestamp,
            balances_scaled_18,
            &self.re_clamm_state.mutable.last_virtual_balances[0],
            &self.re_clamm_state.mutable.last_virtual_balances[1],
            &self.re_clamm_state.mutable.daily_price_shift_base,
            &self.re_clamm_state.mutable.last_timestamp,
            &self.re_clamm_state.mutable.centeredness_margin,
            &self.re_clamm_state.mutable.start_fourth_root_price_ratio,
            &self.re_clamm_state.mutable.end_fourth_root_price_ratio,
            &self.re_clamm_state.mutable.price_ratio_update_start_time,
            &self.re_clamm_state.mutable.price_ratio_update_end_time,
        )
    }
}

impl PoolBase for ReClammPool {
    fn get_maximum_invariant_ratio(&self) -> BigInt {
        // The invariant ratio bounds are required by `IBasePool`, but are unused in this pool type, as liquidity can
        // only be added or removed proportionally.
        BigInt::zero()
    }

    fn get_minimum_invariant_ratio(&self) -> BigInt {
        // The invariant ratio bounds are required by `IBasePool`, but are unused in this pool type, as liquidity can
        // only be added or removed proportionally.
        BigInt::zero()
    }

    fn on_swap(&self, swap_params: &SwapParams) -> Result<BigInt, PoolError> {
        let compute_result = self._compute_current_virtual_balances(&swap_params.balances_live_scaled_18);

        match swap_params.swap_kind {
            SwapKind::GivenIn => {
                let amount_calculated_scaled_18 = compute_out_given_in(
                    &swap_params.balances_live_scaled_18,
                    &compute_result.0, // current_virtual_balance_a
                    &compute_result.1, // current_virtual_balance_b
                    swap_params.token_in_index,
                    swap_params.token_out_index,
                    &swap_params.amount_scaled_18,
                ).map_err(|_| PoolError::InvalidSwapParameters)?;

                Ok(amount_calculated_scaled_18)
            }
            SwapKind::GivenOut => {
                let amount_calculated_scaled_18 = compute_in_given_out(
                    &swap_params.balances_live_scaled_18,
                    &compute_result.0, // current_virtual_balance_a
                    &compute_result.1, // current_virtual_balance_b
                    swap_params.token_in_index,
                    swap_params.token_out_index,
                    &swap_params.amount_scaled_18,
                ).map_err(|_| PoolError::InvalidSwapParameters)?;

                Ok(amount_calculated_scaled_18)
            }
        }
    }

    fn compute_invariant(
        &self,
        _balances_live_scaled18: &[BigInt],
        _rounding: Rounding,
    ) -> Result<BigInt, PoolError> {
        // Only needed for unbalanced liquidity and thats not possible in this pool
        Ok(BigInt::zero())
    }

    fn compute_balance(
        &self,
        _balances_live_scaled18: &[BigInt],
        _token_in_index: usize,
        _invariant_ratio: &BigInt,
    ) -> Result<BigInt, PoolError> {
        // Only needed for unbalanced liquidity and thats not possible in this pool
        Ok(BigInt::zero())
    }
} 
//! FixedPriceLBP pool implementation

use crate::common::errors::PoolError;
use crate::common::maths::{div_down_fixed, mul_down_fixed, mul_up_fixed};
use crate::common::pool_base::PoolBase;
use crate::common::types::{Rounding, SwapKind, SwapParams};
use crate::pools::fixed_price_lbp::fixed_price_lbp_data::FixedPriceLBPState;
use alloy_primitives::U256;

/// FixedPriceLBP pool implementation
pub struct FixedPriceLBPPool {
    project_token_index: usize,
    reserve_token_index: usize,
    project_token_rate: U256,
    is_swap_enabled: bool,
}

impl PoolBase for FixedPriceLBPPool {
    fn on_swap(&self, swap_params: &SwapParams) -> Result<U256, PoolError> {
        if !self.is_swap_enabled {
            return Err(PoolError::InvalidSwapParameters);
        }

        if swap_params.token_in_index == self.project_token_index {
            return Err(PoolError::InvalidSwapParameters);
        }

        match swap_params.swap_kind {
            SwapKind::GivenIn => {
                // Reserve tokens in, project tokens out: amountOut = amountIn / rate
                div_down_fixed(&swap_params.amount_scaled_18, &self.project_token_rate)
            }
            SwapKind::GivenOut => {
                // ExactOut: amountIn = amountOut * rate
                mul_up_fixed(&swap_params.amount_scaled_18, &self.project_token_rate)
            }
        }
    }

    fn compute_invariant(
        &self,
        balances_live_scaled_18: &[U256],
        rounding: Rounding,
    ) -> Result<U256, PoolError> {
        // inv = projectBalance * rate + reserveBalance
        let project_token_value = match rounding {
            Rounding::RoundUp => mul_up_fixed(
                &balances_live_scaled_18[self.project_token_index],
                &self.project_token_rate,
            )?,
            Rounding::RoundDown => mul_down_fixed(
                &balances_live_scaled_18[self.project_token_index],
                &self.project_token_rate,
            )?,
        };

        Ok(project_token_value + balances_live_scaled_18[self.reserve_token_index])
    }

    fn compute_balance(
        &self,
        _balances_live_scaled_18: &[U256],
        _token_in_index: usize,
        _invariant_ratio: &U256,
    ) -> Result<U256, PoolError> {
        Err(PoolError::Custom("UnsupportedOperation".to_string()))
    }

    fn get_maximum_invariant_ratio(&self) -> U256 {
        U256::MAX
    }

    fn get_minimum_invariant_ratio(&self) -> U256 {
        U256::ZERO
    }
}

impl From<FixedPriceLBPState> for FixedPriceLBPPool {
    fn from(state: FixedPriceLBPState) -> Self {
        Self {
            project_token_index: state.immutable.project_token_index,
            reserve_token_index: state.immutable.reserve_token_index,
            project_token_rate: state.immutable.project_token_rate,
            is_swap_enabled: state.mutable.is_swap_enabled,
        }
    }
}

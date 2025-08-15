//! QuantAmm pool implementation

use crate::common::errors::PoolError;
use crate::common::maths::mul_down_fixed;
use crate::common::pool_base::PoolBase;
use crate::common::types::{Rounding, SwapParams};
use crate::pools::quantamm::quantamm_data::QuantAmmState;
use crate::pools::quantamm::quantamm_math::{
    calculate_block_normalised_weight, get_first_four_weights_and_multipliers,
    get_second_four_weights_and_multipliers,
};
use crate::pools::weighted::weighted_math::{MAX_INVARIANT_RATIO, MIN_INVARIANT_RATIO, *};
use num_bigint::BigInt;
use num_traits::Zero;

/// QuantAmm pool implementation
pub struct QuantAmmPool {
    /// Current normalized weights (scaled 18) based on time interpolation
    normalized_weights: Vec<BigInt>,
    /// Pool state
    state: QuantAmmState,
}

impl QuantAmmPool {
    /// Create a new QuantAmm pool
    pub fn new(state: QuantAmmState) -> Result<Self, PoolError> {
        let (first_weights, first_multipliers) = get_first_four_weights_and_multipliers(
            &state.base.tokens,
            &state.mutable.first_four_weights_and_multipliers,
        );

        let (second_weights, second_multipliers) = get_second_four_weights_and_multipliers(
            &state.base.tokens,
            &state.mutable.second_four_weights_and_multipliers,
        );

        let base_weights = [first_weights, second_weights].concat();
        let multipliers = [first_multipliers, second_multipliers].concat();

        if base_weights.is_empty() {
            return Err(PoolError::InvalidSwapParameters);
        }

        // Calculate current normalized weights based on time interpolation
        let normalized_weights = Self::calculate_normalized_weights(
            &base_weights,
            &multipliers,
            &state.mutable.last_update_time,
            &state.mutable.last_interop_time,
            &state.mutable.current_timestamp,
        );

        Ok(Self {
            normalized_weights,
            state,
        })
    }

    /// Calculate normalized weights based on time interpolation
    fn calculate_normalized_weights(
        base_weights: &[BigInt],
        multipliers: &[BigInt],
        last_update_time: &BigInt,
        last_interop_time: &BigInt,
        current_timestamp: &BigInt,
    ) -> Vec<BigInt> {
        let mut multiplier_time = current_timestamp.clone();

        if current_timestamp >= last_interop_time {
            multiplier_time = last_interop_time.clone();
        }

        let time_since_last_update = &multiplier_time - last_update_time;

        let mut normalized_weights = Vec::with_capacity(base_weights.len());

        for i in 0..base_weights.len() {
            let normalized_weight = calculate_block_normalised_weight(
                &base_weights[i],
                &multipliers[i],
                &time_since_last_update,
            );
            normalized_weights.push(normalized_weight);
        }

        normalized_weights
    }

    /// Get normalized weights for a specific token pair
    fn get_normalized_weight_pair(
        &self,
        index_in: usize,
        index_out: usize,
    ) -> Result<(BigInt, BigInt), PoolError> {
        if index_in >= self.normalized_weights.len() || index_out >= self.normalized_weights.len() {
            return Err(PoolError::InvalidTokenIndex);
        }

        let token_in_weight = self.normalized_weights[index_in].clone();
        let token_out_weight = self.normalized_weights[index_out].clone();

        Ok((token_in_weight, token_out_weight))
    }

    /// Check if trade size exceeds max trade size ratio
    fn check_max_trade_size(
        &self,
        amount_scaled_18: &BigInt,
        balance_scaled_18: &BigInt,
    ) -> Result<(), PoolError> {
        let max_amount = mul_down_fixed(
            balance_scaled_18,
            &self.state.immutable.max_trade_size_ratio,
        )
        .unwrap_or_else(|_| BigInt::zero());

        if amount_scaled_18 > &max_amount {
            return Err(PoolError::InvalidSwapParameters);
        }

        Ok(())
    }
}

impl PoolBase for QuantAmmPool {
    fn on_swap(&self, swap_params: &SwapParams) -> Result<BigInt, PoolError> {
        let token_in_index = swap_params.token_in_index;
        let token_out_index = swap_params.token_out_index;

        if token_in_index >= self.normalized_weights.len()
            || token_out_index >= self.normalized_weights.len()
        {
            return Err(PoolError::InvalidTokenIndex);
        }

        let balance_in = &swap_params.balances_live_scaled_18[token_in_index];
        let balance_out = &swap_params.balances_live_scaled_18[token_out_index];
        let amount_scaled_18 = &swap_params.amount_scaled_18;

        let (weight_in, weight_out) =
            self.get_normalized_weight_pair(token_in_index, token_out_index)?;

        match swap_params.swap_kind {
            crate::common::types::SwapKind::GivenIn => {
                // Check max trade size ratio for input
                self.check_max_trade_size(amount_scaled_18, balance_in)?;

                let amount_out_scaled_18 = compute_out_given_exact_in(
                    balance_in,
                    &weight_in,
                    balance_out,
                    &weight_out,
                    amount_scaled_18,
                )?;

                // Check max trade size ratio for output
                self.check_max_trade_size(&amount_out_scaled_18, balance_out)?;

                Ok(amount_out_scaled_18)
            }
            crate::common::types::SwapKind::GivenOut => {
                // Check max trade size ratio for output
                self.check_max_trade_size(amount_scaled_18, balance_out)?;

                let amount_in_scaled_18 = compute_in_given_exact_out(
                    balance_in,
                    &weight_in,
                    balance_out,
                    &weight_out,
                    amount_scaled_18,
                )?;

                // Check max trade size ratio for input
                self.check_max_trade_size(&amount_in_scaled_18, balance_in)?;

                Ok(amount_in_scaled_18)
            }
        }
    }

    fn compute_invariant(
        &self,
        balances_live_scaled_18: &[BigInt],
        rounding: Rounding,
    ) -> Result<BigInt, PoolError> {
        match rounding {
            Rounding::RoundDown => {
                compute_invariant_down(&self.normalized_weights, balances_live_scaled_18)
            }
            Rounding::RoundUp => {
                compute_invariant_up(&self.normalized_weights, balances_live_scaled_18)
            }
        }
    }

    fn compute_balance(
        &self,
        balances_live_scaled_18: &[BigInt],
        token_in_index: usize,
        invariant_ratio: &BigInt,
    ) -> Result<BigInt, PoolError> {
        if token_in_index >= balances_live_scaled_18.len()
            || token_in_index >= self.normalized_weights.len()
        {
            return Err(PoolError::InvalidTokenIndex);
        }

        let current_balance = &balances_live_scaled_18[token_in_index];
        let weight = &self.normalized_weights[token_in_index];

        // Calculate the new balance based on the invariant ratio
        compute_balance_out_given_invariant(current_balance, weight, invariant_ratio)
    }

    fn get_maximum_invariant_ratio(&self) -> BigInt {
        MAX_INVARIANT_RATIO.clone()
    }

    fn get_minimum_invariant_ratio(&self) -> BigInt {
        MIN_INVARIANT_RATIO.clone()
    }
}

impl From<QuantAmmState> for QuantAmmPool {
    fn from(quant_amm_state: QuantAmmState) -> Self {
        Self::new(quant_amm_state).expect("Failed to create QuantAmmPool from state")
    }
}

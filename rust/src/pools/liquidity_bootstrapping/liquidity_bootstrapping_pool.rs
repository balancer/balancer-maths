//! Liquidity Bootstrapping pool implementation

use crate::common::errors::PoolError;
use crate::common::pool_base::PoolBase;
use crate::common::types::{Rounding, SwapParams};
use crate::pools::liquidity_bootstrapping::liquidity_bootstrapping_data::LiquidityBootstrappingState;
use crate::pools::liquidity_bootstrapping::liquidity_bootstrapping_math::get_normalized_weights;
use crate::pools::weighted::weighted_math::{MAX_INVARIANT_RATIO, MIN_INVARIANT_RATIO, *};
use num_bigint::BigInt;

/// Liquidity Bootstrapping pool implementation
pub struct LiquidityBootstrappingPool {
    /// Current normalized weights (scaled 18) based on time interpolation
    normalized_weights: Vec<BigInt>,
    /// Pool state
    state: LiquidityBootstrappingState,
}

impl LiquidityBootstrappingPool {
    /// Create a new Liquidity Bootstrapping pool
    pub fn new(state: LiquidityBootstrappingState) -> Result<Self, PoolError> {
        if state.immutable.start_weights.len() != 2 || state.immutable.end_weights.len() != 2 {
            return Err(PoolError::InvalidSwapParameters);
        }

        // Calculate current normalized weights based on time interpolation
        let normalized_weights = get_normalized_weights(
            state.immutable.project_token_index,
            &state.mutable.current_timestamp,
            &state.immutable.start_time,
            &state.immutable.end_time,
            &state.immutable.start_weights[state.immutable.project_token_index],
            &state.immutable.end_weights[state.immutable.project_token_index],
        );

        Ok(Self {
            normalized_weights,
            state,
        })
    }

    /// Check if swaps are enabled
    fn is_swap_enabled(&self) -> bool {
        self.state.mutable.is_swap_enabled
    }

    /// Check if project token swap in is blocked
    fn is_project_token_swap_in_blocked(&self) -> bool {
        self.state.immutable.is_project_token_swap_in_blocked
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

    /// Validate swap parameters
    fn validate_swap(&self, token_in_index: usize) -> Result<(), PoolError> {
        if !self.is_swap_enabled() {
            return Err(PoolError::InvalidSwapParameters);
        }

        // Check if project token swap in is blocked
        if self.is_project_token_swap_in_blocked() 
            && token_in_index == self.state.immutable.project_token_index {
            return Err(PoolError::InvalidSwapParameters);
        }

        Ok(())
    }
}

impl PoolBase for LiquidityBootstrappingPool {
    fn on_swap(&self, swap_params: &SwapParams) -> Result<BigInt, PoolError> {
        let token_in_index = swap_params.token_in_index;
        let token_out_index = swap_params.token_out_index;

        if token_in_index >= self.normalized_weights.len()
            || token_out_index >= self.normalized_weights.len()
        {
            return Err(PoolError::InvalidTokenIndex);
        }

        // Validate swap parameters
        self.validate_swap(token_in_index)?;

        let balance_in = &swap_params.balances_live_scaled_18[token_in_index];
        let balance_out = &swap_params.balances_live_scaled_18[token_out_index];
        let amount_scaled_18 = &swap_params.amount_scaled_18;

        let (weight_in, weight_out) = self.get_normalized_weight_pair(token_in_index, token_out_index)?;

        match swap_params.swap_kind {
            crate::common::types::SwapKind::GivenIn => {
                compute_out_given_exact_in(
                    balance_in,
                    &weight_in,
                    balance_out,
                    &weight_out,
                    amount_scaled_18,
                )
            }
            crate::common::types::SwapKind::GivenOut => {
                compute_in_given_exact_out(
                    balance_in,
                    &weight_in,
                    balance_out,
                    &weight_out,
                    amount_scaled_18,
                )
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

impl From<LiquidityBootstrappingState> for LiquidityBootstrappingPool {
    fn from(liquidity_bootstrapping_state: LiquidityBootstrappingState) -> Self {
        Self::new(liquidity_bootstrapping_state).expect("Failed to create LiquidityBootstrappingPool from state")
    }
} 
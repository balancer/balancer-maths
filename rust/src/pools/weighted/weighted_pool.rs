//! Weighted pool implementation

use num_bigint::BigInt;
use crate::common::errors::PoolError;
use crate::common::pool_base::{PoolBase, SwapParams, Rounding};
use crate::common::constants::{max_invariant_ratio, min_invariant_ratio};
use crate::pools::weighted::weighted_data::WeightedState;
use crate::pools::weighted::weighted_math::*;

/// Weighted pool implementation
pub struct WeightedPool {
    /// Normalized weights (scaled 18)
    normalized_weights: Vec<BigInt>,
}

impl WeightedPool {
    /// Create a new weighted pool
    pub fn new(weights: Vec<BigInt>) -> Result<Self, PoolError> {
        if weights.is_empty() {
            return Err(PoolError::InvalidSwapParameters);
        }
        Ok(Self {
            normalized_weights: weights,
        })
    }
    
    /// Get the normalized weights
    pub fn normalized_weights(&self) -> &[BigInt] {
        &self.normalized_weights
    }
}

impl PoolBase for WeightedPool {
    fn on_swap(&self, swap_params: &SwapParams) -> Result<BigInt, PoolError> {
        let token_in_index = swap_params.token_in_index;
        let token_out_index = swap_params.token_out_index;
        
        if token_in_index >= self.normalized_weights.len() || token_out_index >= self.normalized_weights.len() {
            return Err(PoolError::InvalidTokenIndex);
        }
        
        let balance_in = &swap_params.balances_live_scaled_18[token_in_index];
        let weight_in = &self.normalized_weights[token_in_index];
        let balance_out = &swap_params.balances_live_scaled_18[token_out_index];
        let weight_out = &self.normalized_weights[token_out_index];
        let amount_scaled_18 = &swap_params.amount_scaled_18;
        
        match swap_params.swap_kind {
            crate::common::types::SwapKind::GivenIn => {
                compute_out_given_exact_in(balance_in, weight_in, balance_out, weight_out, amount_scaled_18)
            }
            crate::common::types::SwapKind::GivenOut => {
                compute_in_given_exact_out(balance_in, weight_in, balance_out, weight_out, amount_scaled_18)
            }
        }
    }
    
    fn compute_invariant(&self, balances_live_scaled_18: &[BigInt], rounding: Rounding) -> Result<BigInt, PoolError> {
        match rounding {
            Rounding::Down => compute_invariant_down(&self.normalized_weights, balances_live_scaled_18),
            Rounding::Up => compute_invariant_up(&self.normalized_weights, balances_live_scaled_18),
        }
    }
    
    fn compute_balance(
        &self,
        balances_live_scaled_18: &[BigInt],
        token_in_index: usize,
        invariant_ratio: &BigInt,
    ) -> Result<BigInt, PoolError> {
        if token_in_index >= balances_live_scaled_18.len() || token_in_index >= self.normalized_weights.len() {
            return Err(PoolError::InvalidTokenIndex);
        }
        
        let current_balance = &balances_live_scaled_18[token_in_index];
        let weight = &self.normalized_weights[token_in_index];
        
        // Calculate the new balance based on the invariant ratio
        compute_balance_out_given_invariant(current_balance, weight, invariant_ratio)
    }
    
    fn get_maximum_invariant_ratio(&self) -> BigInt {
        max_invariant_ratio()
    }
    
    fn get_minimum_invariant_ratio(&self) -> BigInt {
        min_invariant_ratio()
    }
}

impl From<WeightedState> for WeightedPool {
    fn from(weighted_state: WeightedState) -> Self {
        Self {
            normalized_weights: weighted_state.weights,
        }
    }
} 
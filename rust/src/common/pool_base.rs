//! Pool base trait for all pool implementations

use num_bigint::BigInt;
use crate::common::types::*;
use crate::common::errors::PoolError;

/// Trait for pool implementations (matches TypeScript PoolBase interface and Python PoolBase abstract class)
pub trait PoolBase {
    /// Perform swap operation
    fn on_swap(&self, swap_params: &SwapParams) -> Result<BigInt, PoolError>;
    
    /// Compute invariant
    fn compute_invariant(&self, balances_live_scaled_18: &[BigInt], rounding: Rounding) -> Result<BigInt, PoolError>;
    
    /// Compute balance
    fn compute_balance(
        &self,
        balances_live_scaled_18: &[BigInt],
        token_in_index: usize,
        invariant_ratio: &BigInt,
    ) -> Result<BigInt, PoolError>;
    
    /// Get maximum invariant ratio
    fn get_maximum_invariant_ratio(&self) -> BigInt;
    
    /// Get minimum invariant ratio
    fn get_minimum_invariant_ratio(&self) -> BigInt;
}

/// Swap parameters
#[derive(Debug, Clone, PartialEq)]
pub struct SwapParams {
    /// Swap kind
    pub swap_kind: SwapKind,
    /// Token in index
    pub token_in_index: usize,
    /// Token out index
    pub token_out_index: usize,
    /// Amount (scaled 18)
    pub amount_scaled_18: BigInt,
    /// Balances (scaled 18)
    pub balances_live_scaled_18: Vec<BigInt>,
}

/// Rounding mode for calculations
#[derive(Debug, Clone, PartialEq)]
pub enum Rounding {
    /// Round down
    Down,
    /// Round up
    Up,
} 
//! Pool base trait for all pool implementations

use crate::common::errors::PoolError;
use crate::common::types::*;
use num_bigint::BigInt;

/// Trait for pool implementations (matches TypeScript PoolBase interface and Python PoolBase abstract class)
pub trait PoolBase {
    /// Perform swap operation
    fn on_swap(&self, swap_params: &SwapParams) -> Result<BigInt, PoolError>;

    /// Compute invariant
    fn compute_invariant(
        &self,
        balances_live_scaled_18: &[BigInt],
        rounding: Rounding,
    ) -> Result<BigInt, PoolError>;

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

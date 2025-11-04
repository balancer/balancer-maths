//! Pool base trait for all pool implementations

use crate::common::errors::PoolError;
use crate::common::types::*;
use alloy_primitives::U256;

/// Trait for pool implementations (matches TypeScript PoolBase interface and Python PoolBase abstract class)
pub trait PoolBase {
    /// Perform swap operation
    fn on_swap(&self, swap_params: &SwapParams) -> Result<U256, PoolError>;

    /// Compute invariant
    fn compute_invariant(
        &self,
        balances_live_scaled_18: &[U256],
        rounding: Rounding,
    ) -> Result<U256, PoolError>;

    /// Compute balance
    fn compute_balance(
        &self,
        balances_live_scaled_18: &[U256],
        token_in_index: usize,
        invariant_ratio: &U256,
    ) -> Result<U256, PoolError>;

    /// Get maximum invariant ratio
    fn get_maximum_invariant_ratio(&self) -> U256;

    /// Get minimum invariant ratio
    fn get_minimum_invariant_ratio(&self) -> U256;
}

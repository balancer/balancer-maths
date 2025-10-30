//! Mathematical constants used throughout the Balancer maths implementation

use alloy_primitives::U256;
use lazy_static::lazy_static;
use std::str::FromStr;

lazy_static! {
    /// WAD (1e18) - used for fixed-point arithmetic
    pub static ref WAD: U256 = U256::from(1_000_000_000_000_000_000u64);

    /// TWO_WAD (2e18) - used for power calculations
    pub static ref TWO_WAD: U256 = U256::from(2_000_000_000_000_000_000u64);

    /// FOUR_WAD (4e18) - used for power calculations
    pub static ref FOUR_WAD: U256 = U256::from(4_000_000_000_000_000_000u64);

    /// MAX_POW_RELATIVE_ERROR - used for power calculations
    pub static ref MAX_POW_RELATIVE_ERROR: U256 = U256::from(10_000u64);

    // RAY constant for 36 decimal precision
    pub static ref RAY: U256 = U256::from_str("1000000000000000000000000000000000000").unwrap();
}

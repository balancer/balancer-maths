//! Mathematical constants used throughout the Balancer maths implementation

use alloy_primitives::{uint, U256};

/// WAD (1e18) - used for fixed-point arithmetic
pub const WAD: U256 = uint!(1_000_000_000_000_000_000_U256);

/// TWO_WAD (2e18) - used for power calculations
pub const TWO_WAD: U256 = uint!(2_000_000_000_000_000_000_U256);

/// FOUR_WAD (4e18) - used for power calculations
pub const FOUR_WAD: U256 = uint!(4_000_000_000_000_000_000_U256);

/// MAX_POW_RELATIVE_ERROR - used for power calculations
pub const MAX_POW_RELATIVE_ERROR: U256 = uint!(10_000_U256);

/// RAY constant for 36 decimal precision (1e36)
pub const RAY: U256 = uint!(1000000000000000000000000000000000000_U256);

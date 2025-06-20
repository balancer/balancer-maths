//! Mathematical constants used throughout the Balancer maths implementation

use num_bigint::BigInt;
use num_traits::One;

/// WAD (1e18) - used for fixed-point arithmetic
pub const WAD: BigInt = BigInt::from(1_000_000_000_000_000_000u64);

/// TWO_WAD (2e18) - used for power calculations
pub const TWO_WAD: BigInt = BigInt::from(2_000_000_000_000_000_000u64);

/// FOUR_WAD (4e18) - used for power calculations
pub const FOUR_WAD: BigInt = BigInt::from(4_000_000_000_000_000_000u64);

/// MAX_POW_RELATIVE_ERROR - used for power calculations
pub const MAX_POW_RELATIVE_ERROR: BigInt = BigInt::from(10_000u64);

/// Maximum invariant ratio (1e18)
pub const MAX_INVARIANT_RATIO: u64 = 1_000_000_000_000_000_000;

/// Minimum invariant ratio (1)
pub const MIN_INVARIANT_RATIO: u64 = 1;

/// Fixed point scale (1e18) - used for precision in calculations
pub const FIXED_POINT_SCALE: u64 = 1_000_000_000_000_000_000;

/// Maximum swap fee (100%)
pub const MAX_SWAP_FEE: u64 = 1_000_000_000_000_000_000;

/// Maximum weight (100%)
pub const MAX_WEIGHT: u64 = 1_000_000_000_000_000_000;

/// Maximum uint256 value
pub const MAX_UINT256: u64 = u64::MAX;

/// BigInt versions of constants for calculations
pub fn max_invariant_ratio() -> BigInt {
    BigInt::from(MAX_INVARIANT_RATIO)
}

pub fn min_invariant_ratio() -> BigInt {
    BigInt::from(MIN_INVARIANT_RATIO)
}

pub fn fixed_point_scale() -> BigInt {
    BigInt::from(FIXED_POINT_SCALE)
}

pub fn max_swap_fee() -> BigInt {
    BigInt::from(MAX_SWAP_FEE)
}

pub fn max_weight() -> BigInt {
    BigInt::from(MAX_WEIGHT)
}

pub fn max_uint256() -> BigInt {
    BigInt::from(MAX_UINT256)
} 
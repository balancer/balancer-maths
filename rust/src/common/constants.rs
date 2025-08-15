//! Mathematical constants used throughout the Balancer maths implementation

use lazy_static::lazy_static;
use num_bigint::BigInt;

lazy_static! {
    /// WAD (1e18) - used for fixed-point arithmetic
    pub static ref WAD: BigInt = BigInt::from(1_000_000_000_000_000_000u64);

    /// TWO_WAD (2e18) - used for power calculations
    pub static ref TWO_WAD: BigInt = BigInt::from(2_000_000_000_000_000_000u64);

    /// FOUR_WAD (4e18) - used for power calculations
    pub static ref FOUR_WAD: BigInt = BigInt::from(4_000_000_000_000_000_000u64);

    /// MAX_POW_RELATIVE_ERROR - used for power calculations
    pub static ref MAX_POW_RELATIVE_ERROR: BigInt = BigInt::from(10_000u64);
}

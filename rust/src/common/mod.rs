//! Common types, constants, and utilities shared across all pool implementations

pub mod constants;
pub mod errors;
pub mod log_exp_math;
pub mod maths;
pub mod oz_math;
pub mod pool_base;
pub mod types;
pub mod utils;

// Re-export commonly used items without glob imports to avoid ambiguity
pub use constants::WAD;
pub use errors::PoolError;
pub use oz_math::sqrt;
pub use pool_base::PoolBase;
pub use types::{
    AddLiquidityInput, AddLiquidityResult, PoolState, RemoveLiquidityInput, RemoveLiquidityResult,
    Rounding, SwapInput, SwapKind, SwapParams, SwapResult,
};
pub use utils::{
    compute_and_charge_aggregate_swap_fees, copy_to_scaled18_apply_rate_round_down_array,
    copy_to_scaled18_apply_rate_round_up_array, find_case_insensitive_index_in_list,
    get_single_input_index, is_same_address, require_unbalanced_liquidity_enabled,
    to_raw_undo_rate_round_down, to_raw_undo_rate_round_up, to_scaled_18_apply_rate_round_down,
    to_scaled_18_apply_rate_round_up, MAX_UINT256,
};

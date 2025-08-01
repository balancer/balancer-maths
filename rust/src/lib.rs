//! Balancer V3 mathematics library in Rust
//!
//! This library provides reference implementations of mathematical calculations
//! for Balancer V3 pools, including swaps, liquidity operations, and pool-specific math.

pub mod common;
pub mod hooks;
pub mod pools;
pub mod vault;

// Re-export commonly used types for convenience
pub use common::errors::PoolError;
pub use common::pool_base::PoolBase;
pub use common::types::{AddLiquidityKind, PoolState, RemoveLiquidityKind, SwapKind};

// Re-export hook types and traits
pub use hooks::{DefaultHook, HookBase, HookState};

// Re-export pool implementations
pub use pools::weighted::{WeightedPool, WeightedState};

pub use vault::Vault;

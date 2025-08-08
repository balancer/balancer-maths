//! Core types for the Balancer maths library

use crate::pools::buffer::BufferState;
use num_bigint::BigInt;
use serde::{Deserialize, Serialize};

/// Kind of swap operation
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum SwapKind {
    /// Given amount in, calculate amount out
    GivenIn = 0,
    /// Given amount out, calculate amount in
    GivenOut = 1,
}

/// Kind of add liquidity operation
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum AddLiquidityKind {
    /// Add liquidity with specific amounts (unbalanced)
    Unbalanced = 0,
    /// Add liquidity with exact BPT output for single token
    SingleTokenExactOut = 1,
}

/// Kind of remove liquidity operation
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum RemoveLiquidityKind {
    /// Remove liquidity proportionally
    Proportional = 0,
    /// Remove liquidity with exact BPT input for single token
    SingleTokenExactIn = 1,
    /// Remove liquidity with exact token output for single token
    SingleTokenExactOut = 2,
}

/// Input for swap operations
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SwapInput {
    /// Amount to swap (raw, not scaled)
    pub amount_raw: BigInt,
    /// Kind of swap operation
    pub swap_kind: SwapKind,
    /// Token address to swap from
    pub token_in: String,
    /// Token address to swap to
    pub token_out: String,
}

/// Input for add liquidity operations
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct AddLiquidityInput {
    /// Pool address
    pub pool: String,
    /// Maximum amounts to add (raw, not scaled)
    pub max_amounts_in_raw: Vec<BigInt>,
    /// Minimum BPT amount to receive
    pub min_bpt_amount_out_raw: BigInt,
    /// Kind of add liquidity operation
    pub kind: AddLiquidityKind,
}

/// Input for remove liquidity operations
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct RemoveLiquidityInput {
    /// Pool address
    pub pool: String,
    /// Minimum amounts to receive (raw, not scaled)
    pub min_amounts_out_raw: Vec<BigInt>,
    /// Maximum BPT amount to burn
    pub max_bpt_amount_in_raw: BigInt,
    /// Kind of remove liquidity operation
    pub kind: RemoveLiquidityKind,
}

/// Base pool state shared by all pool types
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct BasePoolState {
    /// Pool address
    pub pool_address: String,
    /// Pool type (e.g., "WEIGHTED", "STABLE", etc.)
    pub pool_type: String,
    /// Token addresses
    pub tokens: Vec<String>,
    /// Scaling factors for each token
    pub scaling_factors: Vec<BigInt>,
    /// Token rates (scaled 18)
    pub token_rates: Vec<BigInt>,
    /// Balances (scaled 18)
    pub balances_live_scaled_18: Vec<BigInt>,
    /// Swap fee (scaled 18)
    pub swap_fee: BigInt,
    /// Aggregate swap fee (scaled 18)
    pub aggregate_swap_fee: BigInt,
    /// Total supply (scaled 18)
    pub total_supply: BigInt,
    /// Whether pool supports unbalanced liquidity
    pub supports_unbalanced_liquidity: bool,
    /// Optional hook type
    pub hook_type: Option<String>,
}

/// Pool state - can be any specific pool type
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(untagged)]
pub enum PoolState {
    /// Base pool state
    Base(BasePoolState),
    /// Weighted pool state
    Weighted(crate::pools::weighted::WeightedState),
    /// Stable pool state
    Stable(crate::pools::stable::stable_data::StableState),

    /// Gyro ECLP pool state
    GyroECLP(crate::pools::gyro::gyro_eclp_data::GyroECLPState),
    /// ReClamm pool state
    ReClamm(crate::pools::reclamm::reclamm_data::ReClammState),
    /// QuantAMM pool state
    QuantAmm(crate::pools::quantamm::quantamm_data::QuantAmmState),
    /// Liquidity bootstrapping pool state
    LiquidityBootstrapping(crate::pools::liquidity_bootstrapping::liquidity_bootstrapping_data::LiquidityBootstrappingState),
}

/// Union type for pool states - can be either a normal pool or a buffer pool
#[derive(Debug, Clone)]
pub enum PoolStateOrBuffer {
    Pool(PoolState),
    Buffer(BufferState),
}

/// Result of a swap operation
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SwapResult {
    /// Amount out (raw, not scaled)
    pub amount_out_raw: BigInt,
    /// Fee amount (raw, not scaled)
    pub fee_amount_raw: BigInt,
}

/// Result of an add liquidity operation
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct AddLiquidityResult {
    /// BPT amount minted (raw, not scaled)
    pub bpt_amount_out_raw: BigInt,
    /// Amounts added (raw, not scaled)
    pub amounts_in_raw: Vec<BigInt>,
}

/// Result of a remove liquidity operation
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct RemoveLiquidityResult {
    /// BPT amount burned (raw, not scaled)
    pub bpt_amount_in_raw: BigInt,
    /// Amounts removed (raw, not scaled)
    pub amounts_out_raw: Vec<BigInt>,
}

/// Swap parameters
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
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

/// Base hook state trait
pub trait HookStateBase {
    fn hook_type(&self) -> &str;
}

/// Rounding direction for mathematical operations
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum Rounding {
    RoundDown = 0,
    RoundUp = 1,
}

impl From<crate::pools::weighted::weighted_data::WeightedState> for PoolState {
    fn from(weighted_state: crate::pools::weighted::weighted_data::WeightedState) -> Self {
        PoolState::Weighted(weighted_state)
    }
}

impl PoolState {
    /// Get the base pool state
    pub fn base(&self) -> &BasePoolState {
        match self {
            PoolState::Base(base) => base,
            PoolState::Weighted(weighted) => weighted.base(),
            PoolState::Stable(stable) => &stable.base,

            PoolState::GyroECLP(gyro_eclp) => &gyro_eclp.base,
            PoolState::ReClamm(re_clamm) => &re_clamm.base,
            PoolState::QuantAmm(quant_amm) => &quant_amm.base,
            PoolState::LiquidityBootstrapping(liquidity_bootstrapping) => {
                &liquidity_bootstrapping.base
            }
        }
    }

    /// Get the pool type
    pub fn pool_type(&self) -> &str {
        &self.base().pool_type
    }

    /// Get the pool address
    pub fn pool_address(&self) -> &str {
        &self.base().pool_address
    }
}

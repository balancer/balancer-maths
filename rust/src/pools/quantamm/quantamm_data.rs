use crate::common::types::BasePoolState;
use num_bigint::BigInt;
use serde::{Deserialize, Serialize};

/// QuantAmm mutable state
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct QuantAmmMutable {
    pub first_four_weights_and_multipliers: Vec<BigInt>,
    pub second_four_weights_and_multipliers: Vec<BigInt>,
    pub last_update_time: BigInt,
    pub last_interop_time: BigInt,
    pub current_timestamp: BigInt,
}

/// QuantAmm immutable state
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct QuantAmmImmutable {
    pub max_trade_size_ratio: BigInt,
}

/// QuantAmm pool state
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct QuantAmmState {
    pub base: BasePoolState,
    pub mutable: QuantAmmMutable,
    pub immutable: QuantAmmImmutable,
} 
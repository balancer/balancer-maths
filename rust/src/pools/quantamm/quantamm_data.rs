use crate::common::types::BasePoolState;
use alloy_primitives::{I256, U256};
use serde::{Deserialize, Serialize};

/// QuantAmm mutable state
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct QuantAmmMutable {
    pub first_four_weights_and_multipliers: Vec<I256>, // Can contain negative values
    pub second_four_weights_and_multipliers: Vec<I256>, // Can contain negative values
    pub last_update_time: U256,
    pub last_interop_time: U256,
    pub current_timestamp: U256,
}

/// QuantAmm immutable state
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct QuantAmmImmutable {
    pub max_trade_size_ratio: U256,
}

/// QuantAmm pool state
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct QuantAmmState {
    pub base: BasePoolState,
    pub mutable: QuantAmmMutable,
    pub immutable: QuantAmmImmutable,
}

impl From<QuantAmmState> for crate::common::types::PoolState {
    fn from(state: QuantAmmState) -> Self {
        crate::common::types::PoolState::QuantAmm(state)
    }
}

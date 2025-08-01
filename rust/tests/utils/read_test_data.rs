//! Read and parse test data from JSON files

use balancer_maths_rust::common::types::*;
use balancer_maths_rust::pools::weighted::weighted_data::WeightedState;
use num_bigint::BigInt;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::Path;

/// Base pool information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PoolBase {
    pub chain_id: u64,
    pub block_number: u64,
    pub pool_address: String,
}

/// Weighted pool with base information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WeightedPool {
    #[serde(flatten)]
    pub base: PoolBase,
    #[serde(flatten)]
    pub state: WeightedState,
}

/// Supported pool types
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum SupportedPool {
    Weighted(WeightedPool),
    // Add other pool types as needed
}

/// Swap test data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Swap {
    pub swap_kind: u8,
    pub amount_raw: BigInt,
    pub output_raw: BigInt,
    pub token_in: String,
    pub token_out: String,
    pub test: String,
}

/// Add liquidity test data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Add {
    pub kind: u8,
    pub input_amounts_raw: Vec<BigInt>,
    pub bpt_out_raw: BigInt,
    pub test: String,
}

/// Remove liquidity test data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Remove {
    pub kind: u8,
    pub amounts_out_raw: Vec<BigInt>,
    pub bpt_in_raw: BigInt,
    pub test: String,
}

/// Complete test data structure
#[derive(Debug, Clone)]
pub struct TestData {
    pub swaps: Vec<Swap>,
    pub adds: Vec<Add>,
    pub removes: Vec<Remove>,
    pub pools: HashMap<String, SupportedPool>,
}

/// Raw JSON structure for parsing
#[derive(Debug, Clone, Serialize, Deserialize)]
struct RawTestFile {
    swaps: Option<Vec<RawSwap>>,
    adds: Option<Vec<RawAdd>>,
    removes: Option<Vec<RawRemove>>,
    pool: RawPool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct RawSwap {
    #[serde(rename = "swapKind")]
    swap_kind: u8,
    #[serde(rename = "amountRaw")]
    amount_raw: String,
    #[serde(rename = "outputRaw")]
    output_raw: String,
    #[serde(rename = "tokenIn")]
    token_in: String,
    #[serde(rename = "tokenOut")]
    token_out: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct RawAdd {
    kind: String,
    #[serde(rename = "inputAmountsRaw")]
    input_amounts_raw: Vec<String>,
    #[serde(rename = "bptOutRaw")]
    bpt_out_raw: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct RawRemove {
    kind: String,
    #[serde(rename = "amountsOutRaw")]
    amounts_out_raw: Vec<String>,
    #[serde(rename = "bptInRaw")]
    bpt_in_raw: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct RawPool {
    #[serde(rename = "poolType")]
    pub pool_type: String,
    #[serde(rename = "chainId")]
    pub chain_id: String,
    #[serde(rename = "blockNumber")]
    pub block_number: String,
    #[serde(rename = "poolAddress")]
    pub pool_address: String,
    pub tokens: Vec<String>,
    #[serde(rename = "scalingFactors")]
    pub scaling_factors: Vec<String>,
    #[serde(rename = "swapFee")]
    pub swap_fee: String,
    #[serde(rename = "balancesLiveScaled18")]
    pub balances_live_scaled_18: Vec<String>,
    #[serde(rename = "tokenRates")]
    pub token_rates: Vec<String>,
    #[serde(rename = "totalSupply")]
    pub total_supply: String,
    #[serde(rename = "aggregateSwapFee")]
    pub aggregate_swap_fee: Option<String>,
    #[serde(rename = "supportsUnbalancedLiquidity")]
    pub supports_unbalanced_liquidity: Option<bool>,
    // Weighted pool specific fields
    pub weights: Option<Vec<String>>,
}

/// Read test data from JSON files in the testData directory
pub fn read_test_data() -> Result<TestData, Box<dyn std::error::Error>> {
    let mut pools: HashMap<String, SupportedPool> = HashMap::new();
    let mut swaps: Vec<Swap> = Vec::new();
    let mut adds: Vec<Add> = Vec::new();
    let mut removes: Vec<Remove> = Vec::new();

    // Resolve the directory path relative to the current file's directory
    let absolute_directory_path = Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .unwrap()
        .join("testData")
        .join("testData");

    // Read all files in the directory
    let entries = fs::read_dir(absolute_directory_path)?;

    // Iterate over each file
    for entry in entries {
        let entry = entry?;
        let file_path = entry.path();
        // Check if the file ends with .json
        if let Some(extension) = file_path.extension() {
            if extension == "json" {
                let filename = file_path.file_name().unwrap().to_string_lossy().to_string();
                // Read the file content
                let file_content = fs::read_to_string(&file_path)?;
                // Parse the JSON content
                match serde_json::from_str::<RawTestFile>(&file_content) {
                    Ok(json_data) => {
                        // Process swaps
                        if let Some(raw_swaps) = json_data.swaps {
                            for raw_swap in raw_swaps {
                                swaps.push(Swap {
                                    swap_kind: raw_swap.swap_kind,
                                    amount_raw: raw_swap.amount_raw.parse()?,
                                    output_raw: raw_swap.output_raw.parse()?,
                                    token_in: raw_swap.token_in,
                                    token_out: raw_swap.token_out,
                                    test: filename.clone(),
                                });
                            }
                        }
                        // Process adds
                        if let Some(raw_adds) = json_data.adds {
                            for raw_add in raw_adds {
                                adds.push(Add {
                                    kind: if raw_add.kind == "Unbalanced" { 0 } else { 1 },
                                    input_amounts_raw: raw_add
                                        .input_amounts_raw
                                        .into_iter()
                                        .map(|a| a.parse())
                                        .collect::<Result<Vec<BigInt>, _>>()?,
                                    bpt_out_raw: raw_add.bpt_out_raw.parse()?,
                                    test: filename.clone(),
                                });
                            }
                        }
                        // Process removes
                        if let Some(raw_removes) = json_data.removes {
                            for raw_remove in raw_removes {
                                removes.push(Remove {
                                    kind: map_remove_kind(&raw_remove.kind),
                                    amounts_out_raw: raw_remove
                                        .amounts_out_raw
                                        .into_iter()
                                        .map(|a| a.parse())
                                        .collect::<Result<Vec<BigInt>, _>>()?,
                                    bpt_in_raw: raw_remove.bpt_in_raw.parse()?,
                                    test: filename.clone(),
                                });
                            }
                        }
                        // Process pool
                        let pool = map_pool(json_data.pool)?;
                        pools.insert(filename, pool);
                    }
                    Err(e) => {
                        return Err(e.into());
                    }
                }
            }
        }
    }

    Ok(TestData {
        swaps,
        adds,
        removes,
        pools,
    })
}

/// Map remove liquidity kind string to enum value
fn map_remove_kind(kind: &str) -> u8 {
    match kind {
        "Proportional" => 0,
        "SingleTokenExactIn" => 1,
        "SingleTokenExactOut" => 2,
        _ => panic!("Unsupported RemoveKind: {}", kind),
    }
}

/// Map raw pool data to supported pool type
fn map_pool(raw_pool: RawPool) -> Result<SupportedPool, Box<dyn std::error::Error>> {
    match raw_pool.pool_type.as_str() {
        "WEIGHTED" => {
            let weights = match raw_pool.weights {
                Some(w) => w
                    .into_iter()
                    .map(|w_str| w_str.parse::<BigInt>())
                    .collect::<Result<Vec<BigInt>, _>>()?,
                None => {
                    return Err("Weighted pool missing weights".into());
                }
            };
            let weighted_state = WeightedState {
                base: BasePoolState {
                    pool_address: raw_pool.pool_address.clone(),
                    pool_type: raw_pool.pool_type.clone(),
                    tokens: raw_pool.tokens.clone(),
                    scaling_factors: raw_pool
                        .scaling_factors
                        .into_iter()
                        .map(|sf| sf.parse::<BigInt>())
                        .collect::<Result<Vec<BigInt>, _>>()?,
                    swap_fee: raw_pool.swap_fee.parse::<BigInt>()?,
                    balances_live_scaled_18: raw_pool
                        .balances_live_scaled_18
                        .into_iter()
                        .map(|b| b.parse::<BigInt>())
                        .collect::<Result<Vec<BigInt>, _>>()?,
                    token_rates: raw_pool
                        .token_rates
                        .into_iter()
                        .map(|r| r.parse::<BigInt>())
                        .collect::<Result<Vec<BigInt>, _>>()?,
                    total_supply: raw_pool.total_supply.parse::<BigInt>()?,
                    aggregate_swap_fee: raw_pool
                        .aggregate_swap_fee
                        .unwrap_or_else(|| "0".to_string())
                        .parse::<BigInt>()?,
                    supports_unbalanced_liquidity: raw_pool
                        .supports_unbalanced_liquidity
                        .unwrap_or(true),
                    hook_type: None,
                },
                weights,
            };
            Ok(SupportedPool::Weighted(WeightedPool {
                base: PoolBase {
                    chain_id: raw_pool.chain_id.parse()?,
                    block_number: raw_pool.block_number.parse()?,
                    pool_address: raw_pool.pool_address,
                },
                state: weighted_state,
            }))
        }
        _ => Err(format!("Unsupported pool type: {}", raw_pool.pool_type).into()),
    }
}

//! Read and parse test data from JSON files

use balancer_maths_rust::common::types::*;
use balancer_maths_rust::pools::weighted::weighted_data::WeightedState;
use num_bigint::BigInt;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::Path;

/// Stable pool state for test data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StableState {
    pub base: BasePoolState,
    pub mutable: StableMutable,
}

/// Stable pool mutable state for test data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StableMutable {
    pub amp: BigInt,
}

/// Gyro ECLP immutable state for test data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GyroECLPImmutable {
    pub alpha: BigInt,
    pub beta: BigInt,
    pub c: BigInt,
    pub s: BigInt,
    pub lambda: BigInt,
    pub tau_alpha_x: BigInt,
    pub tau_alpha_y: BigInt,
    pub tau_beta_x: BigInt,
    pub tau_beta_y: BigInt,
    pub u: BigInt,
    pub v: BigInt,
    pub w: BigInt,
    pub z: BigInt,
    pub d_sq: BigInt,
}

/// Gyro ECLP state for test data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GyroECLPState {
    pub base: BasePoolState,
    pub immutable: GyroECLPImmutable,
}

/// QuantAmm mutable state for test data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuantAmmMutable {
    #[serde(rename = "firstFourWeightsAndMultipliers")]
    pub first_four_weights_and_multipliers: Vec<BigInt>,
    #[serde(rename = "secondFourWeightsAndMultipliers")]
    pub second_four_weights_and_multipliers: Vec<BigInt>,
    #[serde(rename = "lastUpdateTime")]
    pub last_update_time: BigInt,
    #[serde(rename = "lastInteropTime")]
    pub last_interop_time: BigInt,
    #[serde(rename = "currentTimestamp")]
    pub current_timestamp: BigInt,
}

/// QuantAmm immutable state for test data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuantAmmImmutable {
    #[serde(rename = "maxTradeSizeRatio")]
    pub max_trade_size_ratio: BigInt,
}

/// QuantAmm state for test data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuantAmmState {
    pub base: BasePoolState,
    pub mutable: QuantAmmMutable,
    pub immutable: QuantAmmImmutable,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LiquidityBootstrappingMutable {
    #[serde(rename = "isSwapEnabled")]
    pub is_swap_enabled: bool,
    #[serde(rename = "currentTimestamp")]
    pub current_timestamp: BigInt,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LiquidityBootstrappingImmutable {
    #[serde(rename = "projectTokenIndex")]
    pub project_token_index: usize,
    #[serde(rename = "isProjectTokenSwapInBlocked")]
    pub is_project_token_swap_in_blocked: bool,
    #[serde(rename = "startWeights")]
    pub start_weights: Vec<BigInt>,
    #[serde(rename = "endWeights")]
    pub end_weights: Vec<BigInt>,
    #[serde(rename = "startTime")]
    pub start_time: BigInt,
    #[serde(rename = "endTime")]
    pub end_time: BigInt,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LiquidityBootstrappingState {
    pub base: BasePoolState,
    pub mutable: LiquidityBootstrappingMutable,
    pub immutable: LiquidityBootstrappingImmutable,
}

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

/// Stable pool with base information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StablePool {
    #[serde(flatten)]
    pub base: PoolBase,
    #[serde(flatten)]
    pub state: StableState,
}

/// Gyro ECLP pool with base information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GyroECLPPool {
    #[serde(flatten)]
    pub base: PoolBase,
    #[serde(flatten)]
    pub state: GyroECLPState,
}

/// QuantAmm pool with base information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuantAmmPool {
    #[serde(flatten)]
    pub base: PoolBase,
    #[serde(flatten)]
    pub state: QuantAmmState,
}

/// Liquidity Bootstrapping pool with base information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LiquidityBootstrappingPool {
    #[serde(flatten)]
    pub base: PoolBase,
    #[serde(flatten)]
    pub state: LiquidityBootstrappingState,
}

/// Supported pool types
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum SupportedPool {
    Weighted(WeightedPool),
    Stable(StablePool),
    GyroECLP(GyroECLPPool),
    QuantAmm(QuantAmmPool),
    LiquidityBootstrapping(LiquidityBootstrappingPool),
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
    // Stable pool specific fields
    pub amp: Option<String>,
    // Gyro ECLP specific fields
    #[serde(rename = "paramsAlpha")]
    pub params_alpha: Option<String>,
    #[serde(rename = "paramsBeta")]
    pub params_beta: Option<String>,
    #[serde(rename = "paramsC")]
    pub params_c: Option<String>,
    #[serde(rename = "paramsS")]
    pub params_s: Option<String>,
    #[serde(rename = "paramsLambda")]
    pub params_lambda: Option<String>,
    #[serde(rename = "tauAlphaX")]
    pub tau_alpha_x: Option<String>,
    #[serde(rename = "tauAlphaY")]
    pub tau_alpha_y: Option<String>,
    #[serde(rename = "tauBetaX")]
    pub tau_beta_x: Option<String>,
    #[serde(rename = "tauBetaY")]
    pub tau_beta_y: Option<String>,
    pub u: Option<String>,
    pub v: Option<String>,
    pub w: Option<String>,
    pub z: Option<String>,
    #[serde(rename = "dSq")]
    pub d_sq: Option<String>,
    // QuantAmm specific fields
    #[serde(rename = "firstFourWeightsAndMultipliers")]
    pub first_four_weights_and_multipliers: Option<Vec<String>>,
    #[serde(rename = "secondFourWeightsAndMultipliers")]
    pub second_four_weights_and_multipliers: Option<Vec<String>>,
    #[serde(rename = "lastUpdateTime")]
    pub last_update_time: Option<String>,
    #[serde(rename = "lastInteropTime")]
    pub last_interop_time: Option<String>,
    #[serde(rename = "currentTimestamp")]
    pub current_timestamp: Option<String>,
    #[serde(rename = "maxTradeSizeRatio")]
    pub max_trade_size_ratio: Option<String>,
    // Liquidity Bootstrapping specific fields
    #[serde(rename = "projectTokenIndex")]
    pub project_token_index: Option<serde_json::Value>,
    #[serde(rename = "isProjectTokenSwapInBlocked")]
    pub is_project_token_swap_in_blocked: Option<bool>,
    #[serde(rename = "startWeights")]
    pub start_weights: Option<Vec<String>>,
    #[serde(rename = "endWeights")]
    pub end_weights: Option<Vec<String>>,
    #[serde(rename = "startTime")]
    pub start_time: Option<String>,
    #[serde(rename = "endTime")]
    pub end_time: Option<String>,
    #[serde(rename = "isSwapEnabled")]
    pub is_swap_enabled: Option<bool>,
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
        "STABLE" => {
            let amp = match raw_pool.amp {
                Some(a) => a.parse::<BigInt>()?,
                None => {
                    return Err("Stable pool missing amp".into());
                }
            };
            let stable_state = StableState {
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
                mutable: StableMutable { amp },
            };
            Ok(SupportedPool::Stable(StablePool {
                base: PoolBase {
                    chain_id: raw_pool.chain_id.parse()?,
                    block_number: raw_pool.block_number.parse()?,
                    pool_address: raw_pool.pool_address,
                },
                state: stable_state,
            }))
        }
        "GYROE" => {
            // Parse all Gyro ECLP parameters
            let alpha = raw_pool.params_alpha.as_ref()
                .ok_or("Gyro ECLP pool missing paramsAlpha")?
                .parse::<BigInt>()?;
            let beta = raw_pool.params_beta.as_ref()
                .ok_or("Gyro ECLP pool missing paramsBeta")?
                .parse::<BigInt>()?;
            let c = raw_pool.params_c.as_ref()
                .ok_or("Gyro ECLP pool missing paramsC")?
                .parse::<BigInt>()?;
            let s = raw_pool.params_s.as_ref()
                .ok_or("Gyro ECLP pool missing paramsS")?
                .parse::<BigInt>()?;
            let lambda = raw_pool.params_lambda.as_ref()
                .ok_or("Gyro ECLP pool missing paramsLambda")?
                .parse::<BigInt>()?;
            let tau_alpha_x = raw_pool.tau_alpha_x.as_ref()
                .ok_or("Gyro ECLP pool missing tauAlphaX")?
                .parse::<BigInt>()?;
            let tau_alpha_y = raw_pool.tau_alpha_y.as_ref()
                .ok_or("Gyro ECLP pool missing tauAlphaY")?
                .parse::<BigInt>()?;
            let tau_beta_x = raw_pool.tau_beta_x.as_ref()
                .ok_or("Gyro ECLP pool missing tauBetaX")?
                .parse::<BigInt>()?;
            let tau_beta_y = raw_pool.tau_beta_y.as_ref()
                .ok_or("Gyro ECLP pool missing tauBetaY")?
                .parse::<BigInt>()?;
            let u = raw_pool.u.as_ref()
                .ok_or("Gyro ECLP pool missing u")?
                .parse::<BigInt>()?;
            let v = raw_pool.v.as_ref()
                .ok_or("Gyro ECLP pool missing v")?
                .parse::<BigInt>()?;
            let w = raw_pool.w.as_ref()
                .ok_or("Gyro ECLP pool missing w")?
                .parse::<BigInt>()?;
            let z = raw_pool.z.as_ref()
                .ok_or("Gyro ECLP pool missing z")?
                .parse::<BigInt>()?;
            let d_sq = raw_pool.d_sq.as_ref()
                .ok_or("Gyro ECLP pool missing dSq")?
                .parse::<BigInt>()?;

            let gyro_eclp_state = GyroECLPState {
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
                immutable: GyroECLPImmutable {
                    alpha,
                    beta,
                    c,
                    s,
                    lambda,
                    tau_alpha_x,
                    tau_alpha_y,
                    tau_beta_x,
                    tau_beta_y,
                    u,
                    v,
                    w,
                    z,
                    d_sq,
                },
            };
            Ok(SupportedPool::GyroECLP(GyroECLPPool {
                base: PoolBase {
                    chain_id: raw_pool.chain_id.parse()?,
                    block_number: raw_pool.block_number.parse()?,
                    pool_address: raw_pool.pool_address,
                },
                state: gyro_eclp_state,
            }))
        }
        "QUANT_AMM_WEIGHTED" => {
            // Parse QuantAmm parameters
            let first_four_weights_and_multipliers = raw_pool.first_four_weights_and_multipliers.as_ref()
                .ok_or("QuantAmm pool missing firstFourWeightsAndMultipliers")?
                .into_iter()
                .map(|w| w.parse::<BigInt>())
                .collect::<Result<Vec<BigInt>, _>>()?;
            
            let second_four_weights_and_multipliers = raw_pool.second_four_weights_and_multipliers.as_ref()
                .ok_or("QuantAmm pool missing secondFourWeightsAndMultipliers")?
                .into_iter()
                .map(|w| w.parse::<BigInt>())
                .collect::<Result<Vec<BigInt>, _>>()?;
            
            let last_update_time = raw_pool.last_update_time.as_ref()
                .ok_or("QuantAmm pool missing lastUpdateTime")?
                .parse::<BigInt>()?;
            
            let last_interop_time = raw_pool.last_interop_time.as_ref()
                .ok_or("QuantAmm pool missing lastInteropTime")?
                .parse::<BigInt>()?;
            
            let current_timestamp = raw_pool.current_timestamp.as_ref()
                .ok_or("QuantAmm pool missing currentTimestamp")?
                .parse::<BigInt>()?;
            
            let max_trade_size_ratio = raw_pool.max_trade_size_ratio.as_ref()
                .ok_or("QuantAmm pool missing maxTradeSizeRatio")?
                .parse::<BigInt>()?;

            let quant_amm_state = QuantAmmState {
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
                mutable: QuantAmmMutable {
                    first_four_weights_and_multipliers,
                    second_four_weights_and_multipliers,
                    last_update_time,
                    last_interop_time,
                    current_timestamp,
                },
                immutable: QuantAmmImmutable {
                    max_trade_size_ratio,
                },
            };
            Ok(SupportedPool::QuantAmm(QuantAmmPool {
                base: PoolBase {
                    chain_id: raw_pool.chain_id.parse()?,
                    block_number: raw_pool.block_number.parse()?,
                    pool_address: raw_pool.pool_address,
                },
                state: quant_amm_state,
            }))
        }
        "LIQUIDITY_BOOTSTRAPPING" => {
            // Parse Liquidity Bootstrapping parameters
            let project_token_index = raw_pool.project_token_index.as_ref()
                .ok_or("Liquidity Bootstrapping pool missing projectTokenIndex")?
                .as_u64()
                .ok_or("projectTokenIndex must be a number")? as usize;
            
            let is_project_token_swap_in_blocked = raw_pool.is_project_token_swap_in_blocked
                .ok_or("Liquidity Bootstrapping pool missing isProjectTokenSwapInBlocked")?;
            
            let start_weights = raw_pool.start_weights.as_ref()
                .ok_or("Liquidity Bootstrapping pool missing startWeights")?
                .into_iter()
                .map(|w| w.parse::<BigInt>())
                .collect::<Result<Vec<BigInt>, _>>()?;
            
            let end_weights = raw_pool.end_weights.as_ref()
                .ok_or("Liquidity Bootstrapping pool missing endWeights")?
                .into_iter()
                .map(|w| w.parse::<BigInt>())
                .collect::<Result<Vec<BigInt>, _>>()?;
            
            let start_time = raw_pool.start_time.as_ref()
                .ok_or("Liquidity Bootstrapping pool missing startTime")?
                .parse::<BigInt>()?;
            
            let end_time = raw_pool.end_time.as_ref()
                .ok_or("Liquidity Bootstrapping pool missing endTime")?
                .parse::<BigInt>()?;
            
            let is_swap_enabled = raw_pool.is_swap_enabled
                .ok_or("Liquidity Bootstrapping pool missing isSwapEnabled")?;
            
            let current_timestamp = raw_pool.current_timestamp.as_ref()
                .ok_or("Liquidity Bootstrapping pool missing currentTimestamp")?
                .parse::<BigInt>()?;

            let liquidity_bootstrapping_state = LiquidityBootstrappingState {
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
                mutable: LiquidityBootstrappingMutable {
                    is_swap_enabled,
                    current_timestamp,
                },
                immutable: LiquidityBootstrappingImmutable {
                    project_token_index,
                    is_project_token_swap_in_blocked,
                    start_weights,
                    end_weights,
                    start_time,
                    end_time,
                },
            };
            Ok(SupportedPool::LiquidityBootstrapping(LiquidityBootstrappingPool {
                base: PoolBase {
                    chain_id: raw_pool.chain_id.parse()?,
                    block_number: raw_pool.block_number.parse()?,
                    pool_address: raw_pool.pool_address,
                },
                state: liquidity_bootstrapping_state,
            }))
        }
        _ => Err(format!("Unsupported pool type: {}", raw_pool.pool_type).into()),
    }
}

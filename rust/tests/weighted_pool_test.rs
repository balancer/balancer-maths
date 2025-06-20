use crate::pools::weighted::weighted_pool::WeightedPool;
use crate::common::types::SwapKind;
use crate::common::pool_base::SwapParams;
use num_bigint::BigInt;
use num_traits::Zero;

#[test]
fn test_weighted_pool_creation() {
    let weights = vec![
        BigInt::from(500_000_000_000_000_000u64), // 50%
        BigInt::from(500_000_000_000_000_000u64), // 50%
    ];
    
    let pool = WeightedPool::new(weights).unwrap();
    assert_eq!(pool.normalized_weights().len(), 2);
}

#[test]
fn test_weighted_pool_creation_invalid_weights() {
    let weights = vec![
        BigInt::from(500_000_000_000_000_000u64), // 50%
        BigInt::from(400_000_000_000_000_000u64), // 40% (should be 50%)
    ];
    
    let result = WeightedPool::new(weights);
    assert!(result.is_err());
}

#[test]
fn test_weighted_pool_creation_empty_weights() {
    let weights = vec![];
    
    let result = WeightedPool::new(weights);
    assert!(result.is_err());
}

#[test]
fn test_weighted_pool_swap() {
    let weights = vec![
        BigInt::from(500_000_000_000_000_000u64), // 50%
        BigInt::from(500_000_000_000_000_000u64), // 50%
    ];
    
    let pool = WeightedPool::new(weights).unwrap();
    
    let swap_params = SwapParams {
        swap_kind: SwapKind::GivenIn,
        token_in_index: 0,
        token_out_index: 1,
        amount_scaled_18: BigInt::from(100_000_000_000_000_000u64), // 0.1 tokens
        balances_live_scaled_18: vec![
            BigInt::from(1000_000_000_000_000_000u64), // 1000 tokens
            BigInt::from(1000_000_000_000_000_000u64), // 1000 tokens
        ],
    };
    
    let result = pool.on_swap(&swap_params).unwrap();
    assert!(result > BigInt::zero());
}

#[test]
fn test_weighted_pool_swap_given_out() {
    let weights = vec![
        BigInt::from(500_000_000_000_000_000u64), // 50%
        BigInt::from(500_000_000_000_000_000u64), // 50%
    ];
    
    let pool = WeightedPool::new(weights).unwrap();
    
    let swap_params = SwapParams {
        swap_kind: SwapKind::GivenOut,
        token_in_index: 0,
        token_out_index: 1,
        amount_scaled_18: BigInt::from(100_000_000_000_000_000u64), // 0.1 tokens
        balances_live_scaled_18: vec![
            BigInt::from(1000_000_000_000_000_000u64), // 1000 tokens
            BigInt::from(1000_000_000_000_000_000u64), // 1000 tokens
        ],
    };
    
    let result = pool.on_swap(&swap_params).unwrap();
    assert!(result > BigInt::zero());
}

#[test]
fn test_weighted_pool_invalid_token_index() {
    let weights = vec![
        BigInt::from(500_000_000_000_000_000u64), // 50%
        BigInt::from(500_000_000_000_000_000u64), // 50%
    ];
    
    let pool = WeightedPool::new(weights).unwrap();
    
    let swap_params = SwapParams {
        swap_kind: SwapKind::GivenIn,
        token_in_index: 2, // Invalid index
        token_out_index: 1,
        amount_scaled_18: BigInt::from(100_000_000_000_000_000u64),
        balances_live_scaled_18: vec![
            BigInt::from(1000_000_000_000_000_000u64),
            BigInt::from(1000_000_000_000_000_000u64),
        ],
    };
    
    let result = pool.on_swap(&swap_params);
    assert!(result.is_err());
}

#[test]
fn test_weighted_pool_compute_invariant() {
    let weights = vec![
        BigInt::from(500_000_000_000_000_000u64), // 50%
        BigInt::from(500_000_000_000_000_000u64), // 50%
    ];
    
    let pool = WeightedPool::new(weights).unwrap();
    
    let balances = vec![
        BigInt::from(1000_000_000_000_000_000u64), // 1000 tokens
        BigInt::from(1000_000_000_000_000_000u64), // 1000 tokens
    ];
    
    let invariant = pool.compute_invariant(&balances, crate::common::pool_base::Rounding::Down).unwrap();
    assert!(invariant > BigInt::zero());
}

#[test]
fn test_weighted_pool_from_weighted_state() {
    use crate::pools::weighted::weighted_data::WeightedState;
    
    let weighted_state = WeightedState {
        weights: vec![
            BigInt::from(500_000_000_000_000_000u64), // 50%
            BigInt::from(500_000_000_000_000_000u64), // 50%
        ],
    };
    
    let pool = WeightedPool::from(weighted_state);
    assert_eq!(pool.normalized_weights().len(), 2);
} 
use crate::pools::weighted::weighted_math::*;
use num_bigint::BigInt;

#[test]
fn test_compute_invariant_down() {
    let balances = vec![
        BigInt::from(1000_000_000_000_000_000u64), // 1000 tokens
        BigInt::from(1000_000_000_000_000_000u64), // 1000 tokens
    ];
    let weights = vec![
        BigInt::from(500_000_000_000_000_000u64), // 50% weight
        BigInt::from(500_000_000_000_000_000u64), // 50% weight
    ];
    
    let invariant = compute_invariant_down(&weights, &balances).unwrap();
    assert!(invariant > BigInt::from(0));
}

#[test]
fn test_compute_invariant_up() {
    let balances = vec![
        BigInt::from(1000_000_000_000_000_000u64), // 1000 tokens
        BigInt::from(1000_000_000_000_000_000u64), // 1000 tokens
    ];
    let weights = vec![
        BigInt::from(500_000_000_000_000_000u64), // 50% weight
        BigInt::from(500_000_000_000_000_000u64), // 50% weight
    ];
    
    let invariant = compute_invariant_up(&weights, &balances).unwrap();
    assert!(invariant > BigInt::from(0));
}

#[test]
fn test_compute_out_given_exact_in() {
    let balance_in = BigInt::from(1000_000_000_000_000_000u64);
    let weight_in = BigInt::from(500_000_000_000_000_000u64);
    let balance_out = BigInt::from(1000_000_000_000_000_000u64);
    let weight_out = BigInt::from(500_000_000_000_000_000u64);
    let amount_in = BigInt::from(100_000_000_000_000_000u64);
    
    let amount_out = compute_out_given_exact_in(
        &balance_in,
        &weight_in,
        &balance_out,
        &weight_out,
        &amount_in,
    ).unwrap();
    
    assert!(amount_out > BigInt::from(0));
    assert!(amount_out < amount_in);
}

#[test]
fn test_compute_in_given_exact_out() {
    let balance_in = BigInt::from(1000_000_000_000_000_000u64);
    let weight_in = BigInt::from(500_000_000_000_000_000u64);
    let balance_out = BigInt::from(1000_000_000_000_000_000u64);
    let weight_out = BigInt::from(500_000_000_000_000_000u64);
    let amount_out = BigInt::from(100_000_000_000_000_000u64);
    
    let amount_in = compute_in_given_exact_out(
        &balance_in,
        &weight_in,
        &balance_out,
        &weight_out,
        &amount_out,
    ).unwrap();
    
    assert!(amount_in > BigInt::from(0));
    assert!(amount_in > amount_out);
}

#[test]
fn test_compute_balance_out_given_invariant() {
    let current_balance = BigInt::from(1000_000_000_000_000_000u64);
    let weight = BigInt::from(500_000_000_000_000_000u64);
    let invariant_ratio = BigInt::from(1_100_000_000_000_000_000u64); // 1.1x
    
    let balance_out = compute_balance_out_given_invariant(
        &current_balance,
        &weight,
        &invariant_ratio,
    ).unwrap();
    
    assert!(balance_out > current_balance);
}

#[test]
fn test_max_in_ratio_exceeded() {
    let balance_in = BigInt::from(1000_000_000_000_000_000u64);
    let weight_in = BigInt::from(500_000_000_000_000_000u64);
    let balance_out = BigInt::from(1000_000_000_000_000_000u64);
    let weight_out = BigInt::from(500_000_000_000_000_000u64);
    let amount_in = BigInt::from(400_000_000_000_000_000u64); // 40% of balance, exceeds 30% limit
    
    let result = compute_out_given_exact_in(
        &balance_in,
        &weight_in,
        &balance_out,
        &weight_out,
        &amount_in,
    );
    
    assert!(result.is_err());
    assert_eq!(result.unwrap_err(), crate::common::errors::PoolError::MaxInRatioExceeded);
}

#[test]
fn test_max_out_ratio_exceeded() {
    let balance_in = BigInt::from(1000_000_000_000_000_000u64);
    let weight_in = BigInt::from(500_000_000_000_000_000u64);
    let balance_out = BigInt::from(1000_000_000_000_000_000u64);
    let weight_out = BigInt::from(500_000_000_000_000_000u64);
    let amount_out = BigInt::from(400_000_000_000_000_000u64); // 40% of balance, exceeds 30% limit
    
    let result = compute_in_given_exact_out(
        &balance_in,
        &weight_in,
        &balance_out,
        &weight_out,
        &amount_out,
    );
    
    assert!(result.is_err());
    assert_eq!(result.unwrap_err(), crate::common::errors::PoolError::MaxOutRatioExceeded);
} 
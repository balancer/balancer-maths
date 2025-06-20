//! Custom error types for the Balancer maths library

use std::fmt;

/// Errors that can occur during pool operations
#[derive(Debug, Clone, PartialEq)]
pub enum PoolError {
    /// Invalid amount provided (zero or negative)
    InvalidAmount,
    
    /// Insufficient liquidity for the operation
    InsufficientLiquidity,
    
    /// Mathematical overflow occurred
    MathOverflow,
    
    /// Invalid pool type specified
    InvalidPoolType,
    
    /// Invalid token index
    InvalidTokenIndex,
    
    /// Invalid swap parameters
    InvalidSwapParameters,
    
    /// Invalid liquidity parameters
    InvalidLiquidityParameters,
    
    /// Pool not found
    PoolNotFound,
    
    /// Hook error
    HookError(String),
    
    /// Custom error message
    Custom(String),
    
    /// Zero invariant error
    ZeroInvariant,
    
    /// Maximum input ratio exceeded
    MaxInRatioExceeded,
    
    /// Maximum output ratio exceeded
    MaxOutRatioExceeded,
    
    /// Invalid input parameters
    InvalidInput(String),
}

impl fmt::Display for PoolError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            PoolError::InvalidAmount => write!(f, "Invalid amount provided"),
            PoolError::InsufficientLiquidity => write!(f, "Insufficient liquidity"),
            PoolError::MathOverflow => write!(f, "Mathematical overflow occurred"),
            PoolError::InvalidPoolType => write!(f, "Invalid pool type"),
            PoolError::InvalidTokenIndex => write!(f, "Invalid token index"),
            PoolError::InvalidSwapParameters => write!(f, "Invalid swap parameters"),
            PoolError::InvalidLiquidityParameters => write!(f, "Invalid liquidity parameters"),
            PoolError::PoolNotFound => write!(f, "Pool not found"),
            PoolError::HookError(msg) => write!(f, "Hook error: {}", msg),
            PoolError::Custom(msg) => write!(f, "Custom error: {}", msg),
            PoolError::ZeroInvariant => write!(f, "Zero invariant"),
            PoolError::MaxInRatioExceeded => write!(f, "Maximum input ratio exceeded"),
            PoolError::MaxOutRatioExceeded => write!(f, "Maximum output ratio exceeded"),
            PoolError::InvalidInput(msg) => write!(f, "Invalid input: {}", msg),
        }
    }
}

impl std::error::Error for PoolError {}

impl From<String> for PoolError {
    fn from(msg: String) -> Self {
        PoolError::Custom(msg)
    }
}

impl From<&str> for PoolError {
    fn from(msg: &str) -> Self {
        PoolError::Custom(msg.to_string())
    }
} 
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

    // Python SystemError equivalents
    /// Input token not found on pool
    InputTokenNotFound,

    /// Output token not found on pool
    OutputTokenNotFound,

    /// Trade amount too small
    TradeAmountTooSmall,

    /// Before swap hook failed
    BeforeSwapHookFailed,

    /// After swap hook failed
    AfterSwapHookFailed,

    /// Before add liquidity hook failed
    BeforeAddLiquidityHookFailed,

    /// After add liquidity hook failed
    AfterAddLiquidityHookFailed,

    /// Before remove liquidity hook failed
    BeforeRemoveLiquidityHookFailed,

    /// After remove liquidity hook failed
    AfterRemoveLiquidityHookFailed,

    /// Unsupported pool type
    UnsupportedPoolType(String),

    /// Unsupported hook type
    UnsupportedHookType(String),

    /// No state for hook
    NoStateForHook(String),

    /// Stable invariant didn't converge
    StableInvariantDidntConverge,
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

            // Python SystemError equivalents
            PoolError::InputTokenNotFound => write!(f, "Input token not found on pool"),
            PoolError::OutputTokenNotFound => write!(f, "Output token not found on pool"),
            PoolError::TradeAmountTooSmall => write!(f, "TradeAmountTooSmall"),
            PoolError::BeforeSwapHookFailed => write!(f, "BeforeSwapHookFailed"),
            PoolError::AfterSwapHookFailed => write!(f, "AfterSwapHookFailed"),
            PoolError::BeforeAddLiquidityHookFailed => write!(f, "BeforeAddLiquidityHookFailed"),
            PoolError::AfterAddLiquidityHookFailed => write!(f, "AfterAddLiquidityHookFailed"),
            PoolError::BeforeRemoveLiquidityHookFailed => {
                write!(f, "BeforeRemoveLiquidityHookFailed")
            }
            PoolError::AfterRemoveLiquidityHookFailed => {
                write!(f, "AfterRemoveLiquidityHookFailed")
            }
            PoolError::UnsupportedPoolType(pool_type) => {
                write!(f, "Unsupported Pool Type: {}", pool_type)
            }
            PoolError::UnsupportedHookType(hook_type) => {
                write!(f, "Unsupported Hook Type: {}", hook_type)
            }
            PoolError::NoStateForHook(hook_name) => write!(f, "No state for Hook: {}", hook_name),
            PoolError::StableInvariantDidntConverge => write!(f, "Stable invariant didn't converge"),
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

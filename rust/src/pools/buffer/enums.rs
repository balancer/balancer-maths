/// Wrapping direction for buffer operations
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum WrappingDirection {
    /// Wrap underlying tokens to wrapped tokens
    Wrap = 0,
    /// Unwrap wrapped tokens to underlying tokens
    Unwrap = 1,
} 
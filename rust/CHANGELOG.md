# Changelog

All notable changes to this project will be documented in this file.

## [0.5.0] - 2026-08-11

### Fixed
- reCLAMM (v1 + v2) no longer panics on off-centre pools with small balances that truncate the invariant to zero; the swap path now returns `PoolError::ZeroInvariant`.
- Fixed-point math helpers (`mul_*_fixed`, `div_*_fixed`, `mul_div_up_fixed`) now detect `U256` overflow via `checked_mul` and return `Err(PoolError::MathOverflow)` instead of panicking or silently producing masked values.
- Removed crate-wide `.unwrap_or(U256::ZERO)` / `.unwrap_or(WAD)` (and related panic-on-err) masking of math-helper `Result`s; failures now propagate as `Err`.

### Changed (BREAKING)
- Renamed `compute_and_charge_aggregate_swap_fees` → `compute_and_charge_aggregate_swap_fees_raw` to make clear it returns the fee in the token's raw units (not scaled-18).
- `compute_current_virtual_balances` and reCLAMM math helpers now return `Result<_, PoolError>` instead of bare tuples.
- Several helpers changed from bare return types to `Result<_, PoolError>`: `compute_fourth_root_price_ratio`, `compute_centeredness`, `compute_invariant` (reCLAMM v1/v2), `_convert_to_shares` / `_convert_to_assets`, `calculate_value_change_progress` / `interpolate_value` / `get_normalized_weights` (LBP), `calculate_block_normalised_weight` (QuantAMM, **pub**), and `gyro_pool_math_sqrt`.
- Behavioural change: inputs that previously produced wrong numeric values (via zero/WAD fallbacks) now surface as `Err`. Callers using `?` are unaffected; callers doing `.unwrap()` will crash where they previously consumed wrong data.

## [0.4.1] - 2025-11-20

### Changed
- Update reCLAMM pricing functions to use scaling factors instead of decimals.

## [0.4.1] - 2025-11-13

### Changed
- Add reCLAMM pricing functions.

## [0.4.0] - 2025-11-13

### Changed
- Update alloy-primitives to 1.3.0.

## [0.3.0] - 2025-10-30

### Changed
- Remove BigInt in favour of Alloy Primitives.
- Use mul_up_mag_u instead of *.

## [0.2.1] - 2025-01-27

### Changed
- Remove minimum Rust version requirement for better dependency compatibility

## [0.2.0] - 2025-10-01

### Fixed
-   Add missing From implementation to all pool types.

## [0.1.0] - 2025-08-28

### Added

-   Initial release of balancer-maths-rust
-   Support for multiple pool types:
    -   Weighted pools
    -   Stable pools
    -   Gyro ECLP pools
    -   ReClamm pools
    -   QuantAmm pools
    -   Liquidity bootstrapping pools
    -   Buffer pools
-   Hook system support:
    -   Akron hook
    -   Directional fee hook
    -   Exit fee hook
    -   Stable surge hook
-   Core vault operations:
    -   Add liquidity (unbalanced and single token)
    -   Remove liquidity (unbalanced and single token)
    -   Swap operations
-   Comprehensive test suite with integration tests
-   Mathematical utilities for fixed-point arithmetic
-   Error handling with custom error types

### Technical Features

-   High-precision BigInt arithmetic for financial calculations
-   Memory-efficient enum variants with boxing
-   Optimized slice operations using `clone_from_slice`
-   Clean initialization patterns for hook configurations
-   Simplified conditional logic and iterator usage
-   Comprehensive clippy optimizations

### Documentation

-   Complete API documentation
-   Integration test examples
-   Hook implementation examples
-   Mathematical formula documentation

---

## Version History

-   **0.1.0**: Initial release with core Balancer V3 functionality

## Contributing

When adding entries to this changelog, please follow these guidelines:

1. **Use present tense** ("Add feature" not "Added feature")
2. **Use imperative mood** ("Move cursor to..." not "Moves cursor to...")
3. **Reference issues and pull requests** liberally after the applicable entry
4. **Consider including credit to external contributors** in the relevant entry

## Categories

-   **Added**: for new features
-   **Changed**: for changes in existing functionality
-   **Deprecated**: for soon-to-be removed features
-   **Removed**: for now removed features
-   **Fixed**: for any bug fixes
-   **Security**: in case of vulnerabilities

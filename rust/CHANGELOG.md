# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

-   New features that have been added

### Changed

-   Changes in existing functionality

### Deprecated

-   Features that will be removed in upcoming releases

### Removed

-   Features that have been removed

### Fixed

-   Bug fixes

### Security

-   Security vulnerability fixes

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

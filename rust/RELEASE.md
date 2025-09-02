# Release Guide for balancer-maths-rust

This guide covers the process for releasing new versions of the `balancer-maths-rust` package on crates.io.

## Prerequisites

1. **Crates.io Account**: Ensure you have a crates.io account and are a maintainer of the package
2. **Cargo Login**: Run `cargo login` to authenticate with crates.io
3. **Git Access**: Ensure you have push access to the repository

## Pre-Release Checklist

Before creating a release, ensure the following:

### 1. Code Quality

-   [ ] All tests pass: `cargo test`
-   [ ] Clippy checks pass: `cargo clippy --all-targets --all-features -- -D warnings`
-   [ ] Formatting passes: `cargo fmt --all -- --check`
-   [ ] Check for unused dependencies: `cargo check --all-targets --all-features`

### 2. Documentation

-   [ ] README.md is up to date
-   [ ] All public APIs are documented
-   [ ] Examples are working and documented
-   [ ] CHANGELOG.md is updated with new features/fixes

### 3. Version Management

-   [ ] Update version in `Cargo.toml`
-   [ ] Update version in documentation if needed
-   [ ] Ensure semantic versioning is followed

## Release Process

### Step 1: Update Version

1. **Edit `Cargo.toml`**:

    ```toml
    [package]
    name = "balancer-maths-rust"
    version = "0.1.1"  # Increment version number
    ```

2. **Update CHANGELOG.md** (if not already done):

    ```markdown
    ## [0.1.1] - 2024-01-XX

    ### Added

    -   New feature description

    ### Changed

    -   Breaking change description

    ### Fixed

    -   Bug fix description
    ```

### Step 2: Build for release

1. **Build for release**:

    ```bash
    cargo build --release
    ```

### Step 3: Commit and Tag

1. **Commit changes**:

    ```bash
    git add .
    git commit -m "Release v0.1.1"
    ```

### Step 4: Publish to Crates.io

1. **Dry run** (optional but recommended):

    ```bash
    cargo package
    ```

2. **Publish**:

    ```bash
    cargo publish
    ```

3. **Verify publication**:
    - Check [crates.io](https://crates.io/crates/balancer-maths-rust)
    - Verify the new version appears
    - Test installation: `cargo install balancer-maths-rust`

## Post-Release Tasks

1. **Update Repository**

-   [ ] Push all changes to main branch

## Troubleshooting

### Rollback Procedure

If a release needs to be rolled back:

1. **Yank the version** (if published):

    ```bash
    cargo yank --version 0.1.1
    ```

2. **Create a new patch release** with fixes:

    - Increment patch version
    - Fix the issues
    - Follow normal release process

3. **Communicate with users**:
    - Update documentation
    - Notify users of the issue and fix

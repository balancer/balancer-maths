# Release Guide for Balancer Maths Python

This guide explains how to release the `balancer-maths` Python package to PyPI.

## Prerequisites

1. **PyPI Account**: You need an account on [PyPI](https://pypi.org) and [TestPyPI](https://test.pypi.org)
2. **API Tokens**: Generate API tokens for both PyPI and TestPyPI
3. **Build Tools**: Ensure you have Python 3.10+ and pip installed

## Pre-Release Checklist

Before releasing, ensure:

-   [ ] All tests pass: `pytest`
-   [ ] Code is formatted: `black src/ test/`
-   [ ] Version number is updated in `pyproject.toml`
-   [ ] Version number is updated in `src/__init__.py`
-   [ ] CHANGELOG.md is updated (if you have one)
-   [ ] README.md is up to date

## Release Process

### 1. Test Build

First, test that the package builds correctly:

```bash
python3 build_and_release.py --all
```

This will:

-   Clean previous build artifacts
-   Install build dependencies
-   Build the package
-   Check the built package

### 2. Test Release (Recommended)

Upload to TestPyPI first to verify everything works:

```bash
python3 build_and_release.py --test-upload
```

You'll be prompted for your TestPyPI credentials.

### 3. Production Release

Once you're satisfied with the test release, upload to PyPI:

```bash
python3 build_and_release.py --upload
```

You'll be prompted for your PyPI credentials.

## Manual Release Process

If you prefer to do it manually:

```bash
# 1. Clean previous builds
rm -rf build/ dist/ *.egg-info/

# 2. Install build tools
pip3 install --upgrade build twine

# 3. Build the package
python3 -m build

# 4. Check the package
twine check dist/*

# 5. Upload to TestPyPI
twine upload --repository testpypi dist/*

# 6. Upload to PyPI
twine upload dist/*
```

## Configuration

### PyPI Credentials

You can configure your PyPI credentials using:

```bash
pip3 install twine
twine configure
```

This will create a `.pypirc` file in your home directory.

### Environment Variables

Alternatively, you can set environment variables:

```bash
export TWINE_USERNAME=your_username
export TWINE_PASSWORD=your_api_token
```

## Version Management

To release a new version:

1. Update the version in `pyproject.toml`:

    ```toml
    [project]
    version = "0.1.1"  # or whatever the new version is
    ```

2. Update the version in `src/__init__.py`:

    ```python
    __version__ = "0.1.1"
    ```

    Note: The version should match between `pyproject.toml` and `src/__init__.py`

3. Commit and tag the release:
    ```bash
    git add .
    git commit -m "Release version 0.1.1"
    git tag v0.1.1
    git push origin main --tags
    ```

## Troubleshooting

### Common Issues

1. **"Package already exists"**: The version number already exists on PyPI. Increment the version number.

2. **"Invalid distribution"**: The package metadata is invalid. Check your `pyproject.toml` configuration.

3. **"Authentication failed"**: Check your PyPI credentials and API tokens.

4. **"Build failed"**: Ensure all dependencies are correctly specified in `pyproject.toml`.

### Getting Help

-   [PyPI Help](https://pypi.org/help/)
-   [Python Packaging User Guide](https://packaging.python.org/)
-   [Twine Documentation](https://twine.readthedocs.io/)

## Package Information

-   **Package Name**: `balancer-maths`
-   **Description**: Python implementation of mathematics for Balancer pools
-   **License**: MIT
-   **Python Version**: >=3.10
-   **Dependencies**: None (pure Python implementation)
-   **Build Backend**: hatchling

## Post-Release

After a successful release:

1. Verify the package is available on PyPI: https://pypi.org/project/balancer-maths/
2. Test installation: `pip install balancer-maths`
3. Update any documentation that references the package
4. Announce the release to relevant channels

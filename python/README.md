# Balancer Maths Python

Python implementation of mathematics for Balancer v3

> **Note**: This is the Python implementation within the [balancer-maths](https://github.com/balancer/balancer-maths) monorepo, which also contains TypeScript and Rust implementations.

## Installation

### From PyPI (recommended)

```bash
pip install balancer-maths
```

### From source

```bash
git clone https://github.com/balancer/balancer-maths.git
cd balancer-maths/python
pip install -e .
```

## Development Setup

1. Create and activate a virtual environment:
```bash
python -m venv .venv
source .venv/bin/activate  # On Windows use: .venv\Scripts\activate
```

2. Install development dependencies:
```bash
pip install -e ".[dev]"
```

## Hooks Support

Hooks are supported on a case by case basis.

When a pool has a hook type included in the pool data relevant hook data must also be passed as an input to any Vault operation. See [Remove Liquidity example](#remove-liquidity) below.

Currently supported hooks:

* ExitFeeHook
  * This hook implements the ExitFeeHookExample found in [mono-repo](https://github.com/balancer/balancer-v3-monorepo/blob/c848c849cb44dc35f05d15858e4fba9f17e92d5e/pkg/pool-hooks/contracts/ExitFeeHookExample.sol)

## Examples

### Swap

```python
from src.vault import Vault
from src.swap import SwapInput, SwapKind

pool = {
    "poolType": "WEIGHTED",
    "chainId": "11155111",
    "blockNumber": "5955145",
    "poolAddress": "0xb2456a6f51530053bc41b0ee700fe6a2c37282e8",
    "tokens": [
        "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9",
        "0xb19382073c7A0aDdbb56Ac6AF1808Fa49e377B75",
    ],
    "scalingFactors": [1000000000000000000, 1000000000000000000],
    "weights": [500000000000000000, 500000000000000000],
    "swapFee": 100000000000000000,
    "balancesLiveScaled18": [2000000000000000000, 2000000000000000000],
    "tokenRates": [1000000000000000000, 1000000000000000000],
    "totalSupply": 1000000000000000000,
    "aggregateSwapFee": 500000000000000000,
}


swap_input = SwapInput(
    amount_raw=100000000,
    swap_kind=SwapKind.GIVENIN,
    token_in=pool['tokens'][0],
    token_out=pool['tokens'][1],
)

vault = Vault()

calculated_result = vault.swap(
    swap_input,
    pool,
)
```

### Add Liquidity

```python
from src.vault import Vault
from src.add_liquidity import AddLiquidityInput, AddLiquidityKind

pool = {
    "poolType": "WEIGHTED",
    "chainId": "11155111",
    "blockNumber": "5955145",
    "poolAddress": "0xb2456a6f51530053bc41b0ee700fe6a2c37282e8",
    "tokens": [
        "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9",
        "0xb19382073c7A0aDdbb56Ac6AF1808Fa49e377B75",
    ],
    "scalingFactors": [1000000000000000000, 1000000000000000000],
    "weights": [500000000000000000, 500000000000000000],
    "swapFee": 100000000000000000,
    "balancesLiveScaled18": [2000000000000000000, 2000000000000000000],
    "tokenRates": [1000000000000000000, 1000000000000000000],
    "totalSupply": 1000000000000000000,
    "aggregateSwapFee": 500000000000000000,
}


add_liquidity_input = AddLiquidityInput(
    pool="0xb2456a6f51530053bc41b0ee700fe6a2c37282e8",
    max_amounts_in_raw=[200000000000000000, 100000000000000000],
    min_bpt_amount_out_raw=0,
    kind=AddLiquidityKind.UNBALANCED,
)

vault = Vault()

calculated_result = vault.add_liquidity(
    add_liquidity_input,
    pool,
)
```

### Remove Liquidity

This example shows how to calculate the result of a remove liqudity operation when the pool is registered with the ExitFee hook.

```python
from src.vault import Vault
from src.remove_liquidity import RemoveLiquidityInput, RemoveLiquidityKind

pool = {
    "poolType": "WEIGHTED",
    "hookType": "ExitFee",
    "chainId": "11155111",
    "blockNumber": "5955145",
    "poolAddress": "0x03722034317d8fb16845213bd3ce15439f9ce136",
    "tokens": [
        "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9",
        "0xb19382073c7A0aDdbb56Ac6AF1808Fa49e377B75",
    ],
    "scalingFactors": [1000000000000000000, 1000000000000000000],
    "weights": [500000000000000000, 500000000000000000],
    "swapFee": 100000000000000000,
    "balancesLiveScaled18": [5000000000000000, 5000000000000000000],
    "tokenRates": [1000000000000000000, 1000000000000000000],
    "totalSupply": 158113883008415798,
    "aggregateSwapFee": 0,
}

remove_liquidity_input = RemoveLiquidityInput(
    pool="0x03722034317d8fb16845213bd3ce15439f9ce136",
    min_amounts_out_raw=[1, 1],
    max_bpt_amount_in_raw=10000000000000,
    kind=RemoveLiquidityKind.PROPORTIONAL,
)

input_hook_state = {
    'removeLiquidityHookFeePercentage': 0,
    'tokens': pool['tokens'],
}

vault = Vault()

calculated_result = vault.remove_liquidity(
    remove_liquidity_input,
    pool,
    hook_state=input_hook_state
)
```

## Building and Releasing

### Local Development

To build the package locally for testing:

```bash
python build_and_release.py --all
```

This will:
- Clean previous build artifacts
- Install build dependencies
- Build the package
- Check the built package

### Releasing to PyPI

1. **Test Release** (recommended first):
```bash
python build_and_release.py --test-upload
```

2. **Production Release**:
```bash
python build_and_release.py --upload
```

**Note**: You'll need to have your PyPI credentials configured. You can set them up using:
```bash
pip install twine
twine configure
```

### Manual Build

If you prefer to build manually:

```bash
# Install build tools
pip install build twine

# Build the package
python -m build

# Check the package
twine check dist/*

# Upload to TestPyPI
twine upload --repository testpypi dist/*

# Upload to PyPI
twine upload dist/*
```


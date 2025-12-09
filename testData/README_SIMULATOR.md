# Simulator Data Configuration

This directory contains separate configuration and data for the pool simulator to avoid interference with the test suite.

## Files

- **`config_simulator.json`** - Configuration file for pools to be used in simulation
- **`simulationData/`** - Directory containing generated pool data for simulation
- **`index_simulator.ts`** - Generation script for simulation data

## Usage

### Adding Pools for Simulation

1. Edit `config_simulator.json` to add pool configurations:

```json
{
    "poolTests": [
        {
            "testName": "Weighted-USDC-DAI",
            "chainId": "11155111",
            "blockNumber": "7439300",
            "poolAddress": "0x86fde41ff01b35846eb2f27868fb2938addd44c4",
            "poolType": "WEIGHTED"
        },
        {
            "testName": "Stable-USDC-USDT",
            "chainId": "1",
            "blockNumber": "12345678",
            "poolAddress": "0x...",
            "poolType": "STABLE"
        }
    ]
}
```

2. Generate pool data using the simulator-specific script:

```bash
cd testData
npm run generate:simulator
# Or to overwrite existing files:
npm run generate:simulator:overwrite
```

3. The generated JSON files will be placed in `simulationData/`

### Loading Simulation Data in Code

```python
from test.utils.read_test_data import read_test_data

# Load from simulationData instead of testData
test_data = read_test_data(use_simulation_data=True)

# Access pools
pool_dict = test_data["pools"]["11155111-7439300-Weighted-USDC-DAI.json"]
```

## Separation from Test Suite

The simulator uses `config_simulator.json` and `simulationData/` to keep simulation pools separate from the test suite's `config.json` and `testData/`. This allows:

- **Independent pool selection** - Add/remove simulation pools without affecting tests
- **Different block numbers** - Use specific blocks for security analysis
- **Isolation** - Prevent simulation data from interfering with CI/CD test runs

## Scripts

Two npm scripts are available:

- **`generate:simulator`** - Generates simulation data from `config_simulator.json` to `simulationData/` (skips existing files)
- **`generate:simulator:overwrite`** - Same as above but overwrites existing files

These scripts are separate from the test data generation scripts (`generate` and `generate:overwrite`) which use `config.json` and output to `testData/`.

## Current Pools

The following pools are currently configured for simulation:

- **Weighted-USDC-DAI** (Sepolia, block 7439300) - 50/50 weighted pool for basic testing

Add more pools by editing `config_simulator.json` and regenerating the data.

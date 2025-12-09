"""Read simulation pool data from simulationData directory."""

import json
import os


def read_simulation_data():
    """Read pool data from simulationData directory.

    Returns:
        Dictionary mapping filenames to pool dictionaries.
        Format: {"filename.json": pool_dict, ...}
    """
    # Define the directory containing simulation JSON files
    relative_path = "../../../testData/simulationData"
    absolute_path = os.path.abspath(
        os.path.join(os.path.dirname(__file__), relative_path)
    )

    pools = {}

    # Check if directory exists
    if not os.path.exists(absolute_path):
        raise FileNotFoundError(
            f"Simulation data directory not found: {absolute_path}\n"
            "Run 'npm run generate:simulator' in testData/ to generate simulation data."
        )

    # Iterate over all files in the directory
    for filename in os.listdir(absolute_path):
        if filename.endswith(".json"):  # Check if the file is a JSON file
            filepath = os.path.join(absolute_path, filename)

            with open(filepath) as json_file:
                data = json.load(json_file)
                # Store only the pool data
                if "pool" in data:
                    pools[filename] = data["pool"]

    if not pools:
        raise ValueError(
            f"No pool data found in {absolute_path}\n"
            "Run 'npm run generate:simulator' in testData/ to generate simulation data."
        )

    return pools

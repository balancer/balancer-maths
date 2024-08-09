import json
import os


def read_test_data():
    # Define the directory containing JSON test files
    relative_path = "../../../testData/testData"
    absolute_path = os.path.abspath(
        os.path.join(os.path.dirname(__file__), relative_path)
    )

    test_data = {"swaps": [], "pools": {}}

    # Iterate over all files in the directory
    for filename in os.listdir(absolute_path):
        if filename.endswith(".json"):  # Check if the file is a JSON file
            filepath = os.path.join(absolute_path, filename)

            with open(filepath) as json_file:
                test = json.load(json_file)
                for swap in test["swaps"]:
                    test_data["swaps"].append(
                        {
                            **swap,
                            "swapKind": swap["swapKind"],
                            "amountRaw": swap["amountRaw"],
                            "outputRaw": swap["outputRaw"],
                            "test": filename,
                        }
                    )

                test_data["pools"][filename] = test["pool"]

    return test_data

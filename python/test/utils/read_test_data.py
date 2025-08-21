import json
import os


def read_test_data():
    # Define the directory containing JSON test files
    relative_path = "../../../testData/testData"
    absolute_path = os.path.abspath(
        os.path.join(os.path.dirname(__file__), relative_path)
    )

    test_data = {"swaps": [], "pools": {}, "adds": [], "removes": []}

    # Iterate over all files in the directory
    for filename in os.listdir(absolute_path):
        if filename.endswith(".json"):  # Check if the file is a JSON file
            filepath = os.path.join(absolute_path, filename)

            with open(filepath) as json_file:
                test = json.load(json_file)
                if "swaps" in test:
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
                if "adds" in test:
                    for add in test["adds"]:
                        test_data["adds"].append(
                            {
                                **add,
                                "kind": 0 if add["kind"] == "Unbalanced" else 1,
                                "test": filename,
                            }
                        )

                if "removes" in test:
                    for remove in test["removes"]:
                        test_data["removes"].append(
                            {
                                **remove,
                                "kind": mapRemoveKind(remove["kind"]),
                                "test": filename,
                            }
                        )

                test_data["pools"][filename] = test["pool"]

    return test_data


def mapRemoveKind(kind):
    if kind == "Proportional":
        return 0
    elif kind == "SingleTokenExactIn":
        return 1
    elif kind == "SingleTokenExactOut":
        return 2
    else:
        raise ValueError("Unsupported RemoveKind:", kind)

from utils.read_test_data import read_test_data
import sys
import os

# Get the directory of the current file
current_file_dir = os.path.dirname(os.path.abspath(__file__))
# Get the parent directory (one level up)
parent_dir = os.path.dirname(current_file_dir)
# Insert the parent directory at the start of sys.path
sys.path.insert(0, parent_dir)

from src.vault import Vault

test_data = read_test_data()


def test_swaps():
    vault = Vault()
    for swapTest in test_data["swaps"]:
        if swapTest["test"] not in test_data["pools"]:
            raise Exception("Pool not in test data: ", swapTest["test"])
        pool = test_data["pools"][swapTest["test"]]
        calculatedAmount = vault.swap({"poolType": "Weighted"})
        assert calculatedAmount == swapTest["outputRaw"]

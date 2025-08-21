#!/usr/bin/env python3
"""
Build and release script for balancer-maths Python package.
"""

import argparse
import subprocess
import sys


def run_command(cmd, check=True):
    """Run a command and return the result."""
    print(f"Running: {cmd}")
    result = subprocess.run(
        cmd, shell=True, capture_output=True, text=True, check=False
    )
    if check and result.returncode != 0:
        print(f"Error running command: {cmd}")
        print(f"stdout: {result.stdout}")
        print(f"stderr: {result.stderr}")
        sys.exit(1)
    return result


def clean_build():
    """Clean previous build artifacts."""
    print("Cleaning build artifacts...")
    run_command("rm -rf build/ dist/ *.egg-info/", check=False)


def install_build_deps():
    """Install build dependencies."""
    print("Installing build dependencies...")
    run_command("pip3 install --upgrade build twine")


def build_package():
    """Build the package."""
    print("Building package...")
    run_command("python3 -m build")


def check_package():
    """Check the built package."""
    print("Checking package...")
    run_command("twine check dist/*")


def upload_to_test_pypi():
    """Upload to TestPyPI."""
    print("Uploading to TestPyPI...")
    run_command("twine upload --repository testpypi dist/*")


def upload_to_pypi():
    """Upload to PyPI."""
    print("Uploading to PyPI...")
    run_command("twine upload dist/*")


def main():
    parser = argparse.ArgumentParser(
        description="Build and release balancer-maths package"
    )
    parser.add_argument("--clean", action="store_true", help="Clean build artifacts")
    parser.add_argument("--build", action="store_true", help="Build the package")
    parser.add_argument("--check", action="store_true", help="Check the built package")
    parser.add_argument("--test-upload", action="store_true", help="Upload to TestPyPI")
    parser.add_argument("--upload", action="store_true", help="Upload to PyPI")
    parser.add_argument(
        "--all", action="store_true", help="Run all steps (except upload)"
    )

    args = parser.parse_args()

    if args.all:
        clean_build()
        install_build_deps()
        build_package()
        check_package()
        return

    if args.clean:
        clean_build()

    if args.build:
        install_build_deps()
        build_package()

    if args.check:
        check_package()

    if args.test_upload:
        upload_to_test_pypi()

    if args.upload:
        upload_to_pypi()

    if not any(
        [args.clean, args.build, args.check, args.test_upload, args.upload, args.all]
    ):
        parser.print_help()


if __name__ == "__main__":
    main()

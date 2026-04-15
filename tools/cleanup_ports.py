#!/usr/bin/env python3
"""
Compatibility wrapper that forwards cleanup to the root start.py command.
"""

import subprocess
import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
START_SCRIPT = PROJECT_ROOT / "start.py"


def main() -> int:
    if not START_SCRIPT.exists():
        print(f"Could not find start.py at {START_SCRIPT}")
        return 1

    result = subprocess.run([sys.executable, str(START_SCRIPT), "stop"], cwd=PROJECT_ROOT)
    return result.returncode


if __name__ == "__main__":
    sys.exit(main())

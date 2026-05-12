"""Run frontend tooling with a project-local Node LTS runtime."""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import urllib.request
import zipfile
from pathlib import Path


NODE_MAJOR = 22
PROJECT_ROOT = Path(__file__).resolve().parents[2]
FRONTEND_DIR = PROJECT_ROOT / "frontend"
RUNTIME_DIR = PROJECT_ROOT / ".devcontrol-runtime" / "node-lts"


def test_node_spawn(node_exe: Path) -> bool:
    """Return whether Node can spawn a child process in this environment."""
    if not node_exe.exists():
        return False

    probe = (
        "const {spawnSync}=require('child_process');"
        "const r=spawnSync('cmd.exe',['/d','/s','/c','echo ok'],{encoding:'utf8'});"
        "if (r.error || r.status !== 0 || !String(r.stdout).includes('ok')) process.exit(1);"
    )
    result = subprocess.run([str(node_exe), "-e", probe], cwd=PROJECT_ROOT, check=False)
    return result.returncode == 0


def find_runtime_node() -> Path | None:
    """Return an existing project-local Node runtime when present."""
    if not RUNTIME_DIR.exists():
        return None

    candidates = sorted(RUNTIME_DIR.rglob("node.exe"), reverse=True)
    return candidates[0] if candidates else None


def resolve_node_release() -> str:
    """Resolve the newest Node major release that provides a Windows x64 zip."""
    with urllib.request.urlopen("https://nodejs.org/dist/index.json", timeout=30) as response:
        releases = json.load(response)

    for release in releases:
        if release["version"].startswith(f"v{NODE_MAJOR}.") and "win-x64-zip" in release.get("files", []):
            return release["version"]

    raise RuntimeError(f"Could not resolve Node {NODE_MAJOR} win-x64 release from nodejs.org.")


def install_node_lts() -> Path:
    """Download and verify a project-local portable Node LTS runtime."""
    RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
    version = resolve_node_release()
    zip_name = f"node-{version}-win-x64.zip"
    zip_path = RUNTIME_DIR / zip_name
    target_dir = RUNTIME_DIR / f"node-{version}-win-x64"
    node_exe = target_dir / "node.exe"

    if not node_exe.exists():
        url = f"https://nodejs.org/dist/{version}/{zip_name}"
        urllib.request.urlretrieve(url, zip_path)
        with zipfile.ZipFile(zip_path) as archive:
            archive.extractall(RUNTIME_DIR)
        zip_path.unlink(missing_ok=True)

    if not test_node_spawn(node_exe):
        raise RuntimeError(f"Portable Node {version} is installed, but child-process spawn is still blocked.")

    return node_exe


def get_node_exe() -> Path:
    """Return a verified project-local Node runtime, installing it when needed."""
    node_exe = find_runtime_node()
    if node_exe and test_node_spawn(node_exe):
        return node_exe
    return install_node_lts()


def run(command: str, extra_args: list[str]) -> int:
    """Run one frontend command with the project-local Node runtime."""
    node_exe = get_node_exe()
    node_root = node_exe.parent

    commands = {
        "install": [node_exe, node_root / "node_modules" / "npm" / "bin" / "npm-cli.js", "ci"],
        "dev": [node_exe, FRONTEND_DIR / "node_modules" / "vite" / "bin" / "vite.js", "--host", "127.0.0.1"],
        "build": [node_exe, FRONTEND_DIR / "node_modules" / "vite" / "bin" / "vite.js", "build"],
        "test": [node_exe, FRONTEND_DIR / "node_modules" / "vitest" / "vitest.mjs", "run"],
        "e2e": [node_exe, FRONTEND_DIR / "node_modules" / "@playwright" / "test" / "cli.js", "test"],
        "version": [node_exe, "-v"],
    }

    args = [str(part) for part in commands[command]] + extra_args
    env = {**os.environ, "PATH": f"{node_root}{os.pathsep}{os.environ.get('PATH', '')}"}
    result = subprocess.run(args, cwd=FRONTEND_DIR, env=env, check=False)
    return result.returncode


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["install", "dev", "build", "test", "e2e", "version"], nargs="?", default="version")
    parser.add_argument("args", nargs=argparse.REMAINDER)
    parsed = parser.parse_args()

    if not shutil.which("python"):
        raise RuntimeError("Python is required to bootstrap the project-local Node runtime.")

    return run(parsed.command, parsed.args)


if __name__ == "__main__":
    raise SystemExit(main())

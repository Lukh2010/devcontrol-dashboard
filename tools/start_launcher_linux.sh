#!/bin/bash
cd "$(dirname "$0")/.."
exec python3 tools/devcontrol/devcontrol_launcher.py

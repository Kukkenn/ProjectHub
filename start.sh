#!/usr/bin/env bash
cd "$(dirname "$0")/backend"
[ -d .venv ] || { python3 -m venv .venv && .venv/bin/pip install -r requirements.txt; }
exec .venv/bin/python run.py

#!/bin/bash
# Synthetic, loopback-only HTTP checks. Start the local Worker with the README's public placeholder.
set -eu
cd -- "$(dirname -- "$0")"
exec node --no-warnings test.mjs --http "${1:-http://127.0.0.1:8787}"

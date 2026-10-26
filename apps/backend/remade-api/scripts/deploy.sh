#!/usr/bin/env bash
set -euo pipefail

worker_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$worker_dir"

# Cloudflare runs build and deploy commands in separate shells.
export PATH="${CARGO_HOME:-$HOME/.cargo}/bin:$PATH"

node --env-file-if-exists=.env configure-wrangler.mjs
exec pnpm exec wrangler deploy --config wrangler.generated.toml

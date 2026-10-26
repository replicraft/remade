#!/usr/bin/env bash
set -euo pipefail

worker_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
repository_dir="$(cd -- "$worker_dir/../../.." && pwd)"
cd "$worker_dir"

pnpm --dir "$repository_dir" install --frozen-lockfile

export PATH="${CARGO_HOME:-$HOME/.cargo}/bin:$PATH"

if ! command -v rustup >/dev/null 2>&1; then
    rust_installer="$(mktemp)"
    trap 'rm -f "$rust_installer"' EXIT
    curl --proto '=https' --tlsv1.2 -fsS https://sh.rustup.rs -o "$rust_installer"
    sh "$rust_installer" -y --profile minimal --default-toolchain none
fi

# Follow the repository's compiler pin rather than maintaining a second version.
rust_channel="$(sed -n 's/^channel = "\([^"]*\)"$/\1/p' rust-toolchain.toml)"
: "${rust_channel:?Missing channel in rust-toolchain.toml}"

rustup toolchain install "$rust_channel" --profile minimal --target wasm32-unknown-unknown
cargo install --locked worker-build --version 0.8.7
worker-build --release

#!/bin/sh
set -ex

# Disable pnpm & corepack version enforcement (backup - packageManager removed from package.json)
export PNPM_PACKAGE_MANAGER_STRICT=0
export COREPACK_ENABLE_STRICT=0

echo "=== Render Build Script ==="
echo "Node: $(node --version)"
echo "pnpm: $(pnpm --version)"

# ─── Minimal workspace for Render (backend only) ────────────────────────────
cat > pnpm-workspace.yaml << 'YAML'
packages:
  - artifacts/api-server
  - lib/db
  - lib/api-zod

catalog:
  drizzle-orm: ^0.45.2
  zod: ^3.25.76
  '@types/node': ^25.3.3
  tsx: ^4.21.0

overrides:
  esbuild: "0.27.3"

autoInstallPeers: false
onlyBuiltDependencies:
  - esbuild
YAML

rm -f pnpm-lock.yaml

echo "Installing dependencies..."
pnpm install --no-frozen-lockfile

echo "Building API server..."
pnpm --filter @workspace/api-server run build

echo "=== Build complete! ==="

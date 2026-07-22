#!/bin/sh
set -ex

# ─── Fix: disable corepack strict version enforcement ───────────────────────
# package.json has "packageManager": "pnpm@9.15.4" which makes corepack try
# to download that exact version. On Render this fails. Setting this env var
# tells corepack to use whatever pnpm is available without enforcing the pin.
export COREPACK_ENABLE_STRICT=0
export COREPACK_ENABLE_AUTO_PIN=0

echo "=== Render Build Script ==="
echo "Node: $(node --version)"
echo "npm: $(npm --version)"
echo "PATH: $PATH"
echo "which pnpm: $(which pnpm 2>&1 || echo NOT_FOUND)"
echo "pnpm version: $(pnpm --version 2>&1 || echo UNAVAILABLE)"
echo "COREPACK: $(corepack --version 2>&1 || echo NOT_FOUND)"

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

echo "Workspace config created, installing..."
pnpm install --no-frozen-lockfile

echo "Building API server..."
pnpm --filter @workspace/api-server run build

echo "Build complete!"

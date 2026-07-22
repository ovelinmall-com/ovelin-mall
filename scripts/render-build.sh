#!/bin/sh
set -ex

# ─── Fix: pnpm & corepack version enforcement ───────────────────────────────
# package.json has "packageManager": "pnpm@9.15.4". Both pnpm itself and
# corepack try to enforce this exact version and fail on Render because the
# binary isn't pre-cached. Disable both checks:
export PNPM_PACKAGE_MANAGER_STRICT=0          # pnpm's own version switch
export COREPACK_ENABLE_STRICT=0               # corepack strict mode
export COREPACK_ENABLE_AUTO_PIN=0             # corepack auto pin

echo "=== Render Build Script ==="
echo "Node: $(node --version)"
echo "npm: $(npm --version)"
echo "pnpm version: $(pnpm --version 2>&1 || echo UNAVAILABLE)"
echo "PATH: $PATH"

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

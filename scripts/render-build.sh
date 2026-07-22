#!/bin/sh
set -e

echo "=== Render Build ==="
echo "Node: $(node --version)"
echo "pnpm: $(pnpm --version)"

# Minimal workspace — only API server packages
cat > pnpm-workspace.yaml << 'YAML'
packages:
  - artifacts/api-server
  - lib/db
  - lib/api-zod

catalog:
  drizzle-orm: '^0.45.2'
  zod: '^3.25.76'
  '@types/node': '^25.3.3'
  tsx: '^4.21.0'

autoInstallPeers: false
onlyBuiltDependencies:
  - esbuild
overrides:
  esbuild: '0.27.3'
YAML

rm -f pnpm-lock.yaml

echo "Installing..."
pnpm install --no-frozen-lockfile

echo "Building..."
pnpm --filter @workspace/api-server run build

echo "=== Done ==="

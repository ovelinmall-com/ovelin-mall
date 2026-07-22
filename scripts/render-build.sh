#!/bin/sh
set -e

echo "=== Render Build ==="
echo "Node: $(node --version)"
echo "npm:  $(npm --version)"

# Disable corepack version enforcement
export COREPACK_ENABLE_STRICT=0
export COREPACK_ENABLE_NETWORK=0

# Detect or install pnpm
if command -v pnpm > /dev/null 2>&1; then
  PNPM_VERSION=$(pnpm --version 2>&1 || echo "unknown")
  echo "pnpm: $PNPM_VERSION (system)"
else
  echo "pnpm not in PATH — installing to /tmp via npm..."
  # Run npm from /tmp so the repo preinstall hook is not triggered
  cd /tmp
  npm install --prefix /tmp/pnpm-bin --ignore-scripts pnpm@9
  cd -
  export PATH="/tmp/pnpm-bin/node_modules/.bin:$PATH"
  echo "pnpm: $(pnpm --version) (installed to /tmp)"
fi

# Minimal workspace — only what the API server needs
cat > pnpm-workspace.yaml << 'YAML'
packages:
  - artifacts/api-server
  - lib/db
  - lib/api-zod

catalog:
  drizzle-orm: '^0.45.2'
  zod: '^3.25.76'
  '@types/node': '^22.0.0'
  tsx: '^4.21.0'

autoInstallPeers: false
onlyBuiltDependencies:
  - esbuild
overrides:
  esbuild: '0.27.3'
YAML

rm -f pnpm-lock.yaml

echo "Installing dependencies..."
pnpm install --no-frozen-lockfile

echo "Building @workspace/api-server..."
pnpm --filter @workspace/api-server run build

echo "=== Build complete! ==="

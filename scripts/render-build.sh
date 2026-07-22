#!/bin/sh
set -e

echo "=== Render Build ==="
echo "Node: $(node --version)"
echo "npm:  $(npm --version)"

# Disable corepack strict mode so the system pnpm is used (no forced version download)
export COREPACK_ENABLE_STRICT=0
export COREPACK_ENABLE_NETWORK=0

# Check if pnpm is available; install via npm if not
if command -v pnpm > /dev/null 2>&1; then
  echo "pnpm: $(pnpm --version) (system)"
else
  echo "pnpm not found — installing via npm to /tmp/pnpm-bin..."
  npm install --prefix /tmp/pnpm-bin pnpm@9 --no-scripts 2>&1
  export PATH="/tmp/pnpm-bin/node_modules/.bin:$PATH"
  echo "pnpm: $(pnpm --version) (from /tmp)"
fi

# Minimal workspace — only API server + its lib dependencies
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

# Remove stale lockfile
rm -f pnpm-lock.yaml

echo "Installing dependencies..."
pnpm install --no-frozen-lockfile --ignore-scripts=false

echo "Building @workspace/api-server..."
pnpm --filter @workspace/api-server run build

echo "=== Build complete! ==="

#!/bin/sh
set -e

echo "=== Render Build Script ==="
echo "Node: $(node --version)"
echo "npm: $(npm --version)"

# إنشاء workspace مبسّط يحتوي فقط على الحزم اللازمة لـ API server
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

# حذف الـ lockfile القديم لإعادة الحل من الصفر
rm -f pnpm-lock.yaml

echo "Workspace config created, installing..."
pnpm install --no-frozen-lockfile

echo "Building API server..."
pnpm --filter @workspace/api-server run build

echo "Build complete!"


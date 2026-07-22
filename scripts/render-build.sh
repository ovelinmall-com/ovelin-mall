#!/bin/sh
set -ex

# Disable pnpm & corepack version enforcement
export PNPM_PACKAGE_MANAGER_STRICT=0
export COREPACK_ENABLE_STRICT=0

echo "=== Render Build Script ==="
echo "Node: $(node --version)"
echo "pnpm: $(pnpm --version)"

# ─── Minimal workspace for Render (API + Frontend) ──────────────────────────
cat > pnpm-workspace.yaml << 'YAML'
packages:
  - artifacts/api-server
  - artifacts/ovelin
  - lib/api-client-react
  - lib/api-zod
  - lib/db

catalog:
  '@replit/vite-plugin-cartographer': ^0.5.21
  '@replit/vite-plugin-dev-banner': ^0.1.1
  '@replit/vite-plugin-runtime-error-modal': ^0.0.6
  '@tailwindcss/vite': ^4.1.14
  '@tanstack/react-query': ^5.90.21
  '@types/node': ^25.3.3
  '@types/react': ^19.2.0
  '@types/react-dom': ^19.2.0
  '@vitejs/plugin-react': ^5.0.4
  class-variance-authority: ^0.7.1
  clsx: ^2.1.1
  drizzle-orm: ^0.45.2
  framer-motion: ^12.23.24
  lucide-react: ^0.545.0
  react: 19.1.0
  react-dom: 19.1.0
  tailwind-merge: ^3.3.1
  tailwindcss: ^4.1.14
  tsx: ^4.21.0
  vite: ^7.3.2
  wouter: ^3.3.5
  zod: ^3.25.76

autoInstallPeers: false
onlyBuiltDependencies:
  - esbuild
  - '@firebase/util'
  - protobufjs

overrides:
  esbuild: "0.27.3"
YAML

rm -f pnpm-lock.yaml

echo "Installing dependencies..."
pnpm install --no-frozen-lockfile

echo "Building frontend (artifacts/ovelin)..."
pnpm --filter @workspace/ovelin run build

echo "Building API server..."
pnpm --filter @workspace/api-server run build

echo "=== Build complete! ==="

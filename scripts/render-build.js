#!/usr/bin/env node
const { execSync } = require("child_process");
const fs = require("fs");

const minimalWorkspace = `packages:
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
`;

console.log("=== Render Build ===");
console.log("Node:", process.version);

// كتابة workspace مبسّط لتجنب تثبيت حزم frontend الخاصة بـ Replit
console.log("Writing minimal pnpm-workspace.yaml...");
fs.writeFileSync("pnpm-workspace.yaml", minimalWorkspace);

// حذف lockfile القديم لإعادة الحل من الصفر
if (fs.existsSync("pnpm-lock.yaml")) {
  fs.unlinkSync("pnpm-lock.yaml");
  console.log("Removed stale pnpm-lock.yaml");
}

// تثبيت التبعيات
console.log("Installing dependencies...");
execSync("pnpm install --no-frozen-lockfile", { stdio: "inherit" });

// بناء api-server
console.log("Building @workspace/api-server...");
execSync("pnpm --filter @workspace/api-server run build", { stdio: "inherit" });

console.log("=== Build complete! ===");
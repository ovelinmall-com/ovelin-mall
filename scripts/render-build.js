#!/usr/bin/env node
/**
 * Render Build Script
 * Installs pnpm to /tmp (always writable) to avoid permission issues,
 * then builds the API server from a minimal workspace config.
 */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

console.log("=== Render Build ===");
console.log("Node:", process.version);
console.log("npm:", execSync("npm --version").toString().trim());

// 1. Install pnpm to /tmp (always writable, no sudo needed)
const pnpmDir = path.join(os.tmpdir(), "pnpm-install");
console.log("\nInstalling pnpm@9 to", pnpmDir, "...");
execSync(`npm install --prefix "${pnpmDir}" pnpm@9`, { stdio: "inherit" });
const pnpm = path.join(pnpmDir, "node_modules", ".bin", "pnpm");
console.log("pnpm version:", execSync(`"${pnpm}" --version`).toString().trim());

// 2. Write a minimal pnpm-workspace.yaml (avoids installing Replit-specific frontend packages)
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
console.log("\nWriting minimal pnpm-workspace.yaml...");
fs.writeFileSync("pnpm-workspace.yaml", minimalWorkspace);

// 3. Remove stale lockfile so pnpm resolves fresh
if (fs.existsSync("pnpm-lock.yaml")) {
  fs.unlinkSync("pnpm-lock.yaml");
  console.log("Removed stale pnpm-lock.yaml");
}

// 4. Install only what the API server needs
console.log("\nInstalling API server dependencies...");
execSync(`"${pnpm}" install --no-frozen-lockfile`, { stdio: "inherit" });

// 5. Build
console.log("\nBuilding @workspace/api-server...");
execSync(`"${pnpm}" --filter @workspace/api-server run build`, { stdio: "inherit" });

console.log("\n=== Build complete! ===");
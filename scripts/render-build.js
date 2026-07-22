#!/usr/bin/env node
// ES module — scripts/package.json has "type": "module"
// pnpm is pre-installed in Render's Node.js build environment
import { execSync } from "child_process";
import { writeFileSync, existsSync, unlinkSync } from "fs";
import { fileURLToPath } from "url";
import { join, dirname } from "path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
console.log("=== Render Build ===");
console.log("Node:", process.version);
console.log("Root:", ROOT);

// Confirm pnpm is available
try {
  const pnpmVer = execSync("pnpm --version").toString().trim();
  console.log("pnpm:", pnpmVer);
} catch {
  console.error("pnpm not found — trying npx pnpm@9...");
  // fallback: use npx (does not trigger local preinstall hooks)
}

// Write minimal workspace (only API server + its lib deps)
const ws = `packages:
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
  "esbuild>@esbuild/darwin-arm64": "-"
  "esbuild>@esbuild/darwin-x64": "-"
  "esbuild>@esbuild/win32-arm64": "-"
  "esbuild>@esbuild/win32-ia32": "-"
  "esbuild>@esbuild/win32-x64": "-"
`;
console.log("\n[1] Writing minimal pnpm-workspace.yaml...");
writeFileSync(join(ROOT, "pnpm-workspace.yaml"), ws);

// Remove stale lockfile
const lock = join(ROOT, "pnpm-lock.yaml");
if (existsSync(lock)) { unlinkSync(lock); console.log("Removed pnpm-lock.yaml"); }

// Install & build
const PNPM = "pnpm";
console.log("\n[2] Installing dependencies...");
execSync(PNPM + " install --no-frozen-lockfile", { stdio: "inherit", cwd: ROOT });

console.log("\n[3] Building @workspace/api-server...");
execSync(PNPM + " --filter @workspace/api-server run build", { stdio: "inherit", cwd: ROOT });

console.log("\n=== Build complete! ===");

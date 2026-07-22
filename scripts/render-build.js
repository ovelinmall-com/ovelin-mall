#!/usr/bin/env node
// ES module syntax — required because scripts/package.json has "type": "module"
import { execSync } from "child_process";
import { writeFileSync, existsSync, unlinkSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

console.log("=== Render Build ===");
console.log("Node:", process.version);
console.log("npm:", execSync("npm --version").toString().trim());

// 1. Install pnpm to /tmp
// Use --ignore-scripts to bypass the root package.json preinstall hook
// (which blocks npm and only allows pnpm)
const pnpmDir = join(tmpdir(), "pnpm-install");
console.log("\nInstalling pnpm@9 to", pnpmDir, "...");
execSync("npm install --prefix " + pnpmDir + " --ignore-scripts pnpm@9", { stdio: "inherit" });
const pnpm = join(pnpmDir, "node_modules", ".bin", "pnpm");
console.log("pnpm version:", execSync('"' + pnpm + '" --version').toString().trim());

// 2. Write a minimal pnpm-workspace.yaml (avoids installing Replit-specific frontend packages)
const minimalWorkspace = [
  "packages:",
  "  - artifacts/api-server",
  "  - lib/db",
  "  - lib/api-zod",
  "",
  "catalog:",
  "  drizzle-orm: '^0.45.2'",
  "  zod: '^3.25.76'",
  "  '@types/node': '^25.3.3'",
  "  tsx: '^4.21.0'",
  "",
  "autoInstallPeers: false",
  "",
  "onlyBuiltDependencies:",
  "  - esbuild",
  "",
  "overrides:",
  "  esbuild: '0.27.3'",
  "  \"esbuild>@esbuild/darwin-arm64\": \"-\"",
  "  \"esbuild>@esbuild/darwin-x64\": \"-\"",
  "  \"esbuild>@esbuild/win32-arm64\": \"-\"",
  "  \"esbuild>@esbuild/win32-ia32\": \"-\"",
  "  \"esbuild>@esbuild/win32-x64\": \"-\"",
].join("\n") + "\n";

console.log("\nWriting minimal pnpm-workspace.yaml...");
writeFileSync("pnpm-workspace.yaml", minimalWorkspace);

// 3. Remove stale lockfile so pnpm resolves fresh
if (existsSync("pnpm-lock.yaml")) {
  unlinkSync("pnpm-lock.yaml");
  console.log("Removed stale pnpm-lock.yaml");
}

// 4. Install only what the API server needs
console.log("\nInstalling API server dependencies...");
execSync('"' + pnpm + '" install --no-frozen-lockfile', { stdio: "inherit" });

// 5. Build
console.log("\nBuilding @workspace/api-server...");
execSync('"' + pnpm + '" --filter @workspace/api-server run build', { stdio: "inherit" });

console.log("\n=== Build complete! ===");

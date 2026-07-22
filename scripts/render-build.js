#!/usr/bin/env node
// ES module — scripts/package.json has "type": "module"
import { execSync } from "child_process";
import { writeFileSync, existsSync, unlinkSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { fileURLToPath } from "url";

const TMP = tmpdir();
const ROOT = join(fileURLToPath(import.meta.url), "..", "..");
console.log("=== Render Build ===");
console.log("Node:", process.version);
console.log("Root:", ROOT);

// 1. Install pnpm — run npm from /tmp so it never sees the root preinstall hook
const pnpmDir = join(TMP, "pnpm-install");
console.log("\n[1] Installing pnpm@9 to", pnpmDir, "...");
execSync("npm install --prefix " + pnpmDir + " pnpm@9", {
  stdio: "inherit",
  cwd: TMP,
});
const pnpm = join(pnpmDir, "node_modules", ".bin", "pnpm");
console.log("pnpm:", execSync('"' + pnpm + '" --version').toString().trim());

// 2. Write minimal workspace config (only API server packages)
const ws = [
  "packages:",
  "  - artifacts/api-server",
  "  - lib/db",
  "  - lib/api-zod",
  "catalog:",
  "  drizzle-orm: '^0.45.2'",
  "  zod: '^3.25.76'",
  "  '@types/node': '^25.3.3'",
  "  tsx: '^4.21.0'",
  "autoInstallPeers: false",
  "onlyBuiltDependencies:",
  "  - esbuild",
  "overrides:",
  "  esbuild: '0.27.3'",
  "  \"esbuild>@esbuild/darwin-arm64\": \"-\"",
  "  \"esbuild>@esbuild/darwin-x64\": \"-\"",
  "  \"esbuild>@esbuild/win32-arm64\": \"-\"",
  "  \"esbuild>@esbuild/win32-ia32\": \"-\"",
  "  \"esbuild>@esbuild/win32-x64\": \"-\"",
].join("\n") + "\n";
console.log("\n[2] Writing minimal pnpm-workspace.yaml...");
writeFileSync(join(ROOT, "pnpm-workspace.yaml"), ws);

// 3. Remove stale lockfile
const lockfile = join(ROOT, "pnpm-lock.yaml");
if (existsSync(lockfile)) { unlinkSync(lockfile); console.log("Removed pnpm-lock.yaml"); }

// 4. Install dependencies
console.log("\n[3] Installing dependencies...");
execSync('"' + pnpm + '" install --no-frozen-lockfile', { stdio: "inherit", cwd: ROOT });

// 5. Build
console.log("\n[4] Building @workspace/api-server...");
execSync('"' + pnpm + '" --filter @workspace/api-server run build', { stdio: "inherit", cwd: ROOT });

console.log("\n=== Build complete! ===");

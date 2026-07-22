#!/usr/bin/env node
// ES module — scripts/package.json has "type": "module"
// Delegates all build logic to render-build.sh (which works reliably)
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
console.log("=== Render Build (delegating to render-build.sh) ===");
execSync("bash scripts/render-build.sh", { stdio: "inherit", cwd: ROOT });

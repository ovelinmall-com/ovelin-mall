# Ovelin Mall — Complete Source Export

This archive contains the complete project source after the latest fixes: frontend, API server, shared libraries, scripts, public assets, push/service-worker/Firebase-related files, configuration, lockfile, and the APK source asset.

## Installation and development

This project is a pnpm monorepo. Use pnpm, not npm, because the workspace uses catalog and workspace dependencies.

    pnpm install
    pnpm --filter @workspace/api-server run dev
    pnpm --filter @workspace/ovelin run dev

The frontend expects the API server to be running. The Replit workflows normally start both processes together.

## Exclusions

Only reproducible or local/generated files were excluded: node_modules, .git, dist, build output, Vite/cache folders, TypeScript build-info files, logs, Replit local state/skills, and the previous ZIP export. No frontend/backend source, public assets, configuration, lockfile, or APK asset was removed.

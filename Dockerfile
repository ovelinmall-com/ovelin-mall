# ============================================================
# Ovelin Mall — HuggingFace Docker Space
# PORT: 7860
# ============================================================

# Stage 1: Build
FROM node:24-slim AS builder
WORKDIR /app

RUN npm install -g pnpm@10

# Copy workspace config first for layer caching
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml .npmrc ./
COPY tsconfig.base.json tsconfig.json ./

# Copy all source
COPY lib/ lib/
COPY artifacts/api-server/ artifacts/api-server/
COPY artifacts/ovelin/ artifacts/ovelin/
COPY scripts/ scripts/

# Install all dependencies
RUN pnpm install --no-frozen-lockfile

# Build TypeScript libs
RUN pnpm run typecheck:libs

# Build Express API server (esbuild → dist/index.mjs)
RUN NODE_ENV=production pnpm --filter @workspace/api-server run build

# Build React Vite frontend
RUN PORT=7860 BASE_PATH=/ NODE_ENV=production pnpm --filter @workspace/ovelin run build

# Stage 2: Production image
FROM node:24-slim AS production
WORKDIR /app

RUN npm install -g pnpm@10

# Copy built API server
COPY --from=builder /app/artifacts/api-server/dist/ ./dist/
COPY --from=builder /app/artifacts/api-server/package.json ./package.json

# Copy built frontend next to dist so Express can serve it
COPY --from=builder /app/artifacts/ovelin/dist/public/ ./public/

# Install only production deps for the API server
RUN pnpm install --prod --no-frozen-lockfile

ENV PORT=7860
ENV NODE_ENV=production

EXPOSE 7860

CMD ["node", "--enable-source-maps", "dist/index.mjs"]

FROM node:24-slim

# Install pnpm
RUN npm install -g pnpm@10

WORKDIR /app

# Copy workspace config first for better layer caching
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY tsconfig.base.json tsconfig.json ./

# Copy all packages
COPY lib/ ./lib/
COPY artifacts/api-server/ ./artifacts/api-server/
COPY artifacts/ovelin/ ./artifacts/ovelin/
COPY scripts/ ./scripts/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build typecheck libs
RUN pnpm run typecheck:libs

# Build frontend
RUN pnpm --filter @workspace/ovelin run build

# Build API server
RUN pnpm --filter @workspace/api-server run build

# Expose port
EXPOSE 8080

# Start API server (serves static frontend in production)
ENV PORT=8080
ENV NODE_ENV=production

CMD ["node", "--enable-source-maps", "artifacts/api-server/dist/index.mjs"]

FROM node:24-slim

# تثبيت pnpm
RUN npm install -g pnpm@9

WORKDIR /app

# نسخ ملفات الـ workspace
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY tsconfig.base.json tsconfig.json ./

# نسخ الـ packages
COPY lib/ ./lib/
COPY scripts/ ./scripts/
COPY artifacts/api-server/ ./artifacts/api-server/
COPY artifacts/ovelin/ ./artifacts/ovelin/

# تثبيت الـ dependencies
RUN pnpm install --frozen-lockfile

# بناء الـ libs أولاً
RUN pnpm run typecheck:libs

# بناء الـ frontend
RUN NODE_ENV=production BASE_PATH=/ pnpm --filter @workspace/ovelin exec vite build --config vite.config.ts

# بناء الـ API server
RUN pnpm --filter @workspace/api-server run build

EXPOSE 7860

ENV PORT=7860
ENV NODE_ENV=production
ENV STATIC_DIR=/app/artifacts/ovelin/dist/public

CMD ["node", "artifacts/api-server/dist/index.mjs"]

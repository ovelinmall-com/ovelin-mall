FROM node:24-slim

RUN npm install -g pnpm@10

WORKDIR /app

COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY tsconfig.base.json ./
COPY tsconfig.json ./

COPY lib/ ./lib/
COPY artifacts/api-server/ ./artifacts/api-server/
COPY artifacts/ovelin/dist/ ./artifacts/ovelin/dist/
COPY scripts/ ./scripts/

RUN pnpm install --frozen-lockfile --ignore-scripts

RUN pnpm --filter @workspace/api-server run build

EXPOSE 8080

ENV NODE_ENV=production
ENV PORT=8080

CMD ["node", "--enable-source-maps", "./artifacts/api-server/dist/index.mjs"]

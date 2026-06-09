FROM node:24-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN npm install -g pnpm@10.26.1

COPY pnpm-workspace.yaml pnpm-lock.yaml .npmrc package.json tsconfig.json tsconfig.base.json ./

COPY lib/db/package.json         ./lib/db/
COPY lib/db/tsconfig.json        ./lib/db/
COPY lib/db/drizzle.config.ts    ./lib/db/
COPY lib/db/src                  ./lib/db/src/

COPY lib/api-zod/package.json    ./lib/api-zod/
COPY lib/api-zod/tsconfig.json   ./lib/api-zod/
COPY lib/api-zod/src             ./lib/api-zod/src/

COPY lib/api-client-react/package.json   ./lib/api-client-react/
COPY lib/api-client-react/tsconfig.json  ./lib/api-client-react/
COPY lib/api-client-react/src            ./lib/api-client-react/src/

COPY lib/api-spec ./lib/api-spec/

COPY artifacts/api-server/package.json  ./artifacts/api-server/
COPY artifacts/api-server/tsconfig.json ./artifacts/api-server/
COPY artifacts/api-server/build.mjs     ./artifacts/api-server/
COPY artifacts/api-server/src           ./artifacts/api-server/src/

COPY artifacts/ovelin/package.json   ./artifacts/ovelin/
COPY artifacts/ovelin/tsconfig.json  ./artifacts/ovelin/
COPY artifacts/ovelin/vite.config.ts ./artifacts/ovelin/
COPY artifacts/ovelin/index.html     ./artifacts/ovelin/
COPY artifacts/ovelin/components.json ./artifacts/ovelin/
COPY artifacts/ovelin/src            ./artifacts/ovelin/src/
COPY artifacts/ovelin/public         ./artifacts/ovelin/public/

COPY scripts ./scripts/

RUN pnpm install --frozen-lockfile --ignore-scripts

RUN BASE_PATH="/" PORT=20220 pnpm --filter @workspace/ovelin run build

RUN NODE_ENV=production pnpm --filter @workspace/api-server run build

EXPOSE 7860

ENV PORT=7860
ENV NODE_ENV=production

CMD ["node", "--enable-source-maps", "artifacts/api-server/dist/index.mjs"]

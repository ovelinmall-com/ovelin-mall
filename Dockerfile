FROM node:24-alpine

WORKDIR /app

RUN npm install -g pnpm@10

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY artifacts/api-server/package.json ./artifacts/api-server/
COPY artifacts/ovelin/package.json ./artifacts/ovelin/
COPY lib/db/package.json ./lib/db/
COPY lib/api-zod/package.json ./lib/api-zod/
COPY lib/api-client-react/package.json ./lib/api-client-react/
COPY lib/api-spec/package.json ./lib/api-spec/
COPY scripts/package.json ./scripts/

RUN pnpm install --frozen-lockfile

COPY . .

ENV BASE_PATH=/
RUN pnpm --filter @workspace/ovelin run build

RUN pnpm --filter @workspace/api-server run build

EXPOSE 7860

ENV PORT=7860
ENV NODE_ENV=production

CMD ["node", "--enable-source-maps", "artifacts/api-server/dist/index.mjs"]

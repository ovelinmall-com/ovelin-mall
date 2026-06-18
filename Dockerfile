FROM node:24-slim

RUN apt-get update && apt-get install -y git --no-install-recommends && rm -rf /var/lib/apt/lists/*

RUN git clone https://github.com/ovelinmall-com/ovelin-mall.git /app

WORKDIR /app

EXPOSE 7860

ENV PORT=7860
ENV NODE_ENV=production

CMD ["node", "artifacts/api-server/dist/index.mjs"]

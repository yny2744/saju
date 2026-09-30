FROM node:20-slim AS base
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=base /app/dist ./dist
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/package.json ./package.json

# Phase 1에서는 이 이미지를 직접 서버로 구동하지 않는다.
# n8n Code 노드 또는 별도 API 서버(Phase 4~5)에서 이 dist를 require해서 쓰는 것을 전제로 한다.
CMD ["node", "dist/cli.js"]

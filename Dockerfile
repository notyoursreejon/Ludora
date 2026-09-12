FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY packages/engine/package*.json ./packages/engine/
COPY packages/ludo-engine/package*.json ./packages/ludo-engine/
COPY server/package*.json ./server/

RUN npm ci

COPY tsconfig*.json ./
COPY packages ./packages
COPY server ./server

RUN npm run build:server

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000

COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY packages/engine/package*.json ./packages/engine/
COPY packages/ludo-engine/package*.json ./packages/ludo-engine/
COPY server/package*.json ./server/

RUN npm ci --omit=dev

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/engine/dist ./packages/engine/dist
COPY --from=builder /app/packages/ludo-engine/dist ./packages/ludo-engine/dist
COPY --from=builder /app/server/dist ./server/dist

EXPOSE 4000

CMD ["npm", "run", "start", "--workspace=server"]

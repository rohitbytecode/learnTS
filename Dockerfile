FROM node:20-alpine AS base

WORKDIR /app

COPY package*.json ./
COPY prisma.config.ts ./
COPY prisma ./prisma

COPY . .
RUN npm ci

FROM base AS development

RUN npx prisma generate

CMD ["npm", "run", "dev"]

FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS production

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY .env ./
COPY prisma.config.ts ./

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
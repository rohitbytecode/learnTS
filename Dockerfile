# base (used for multiple stagess)
FROM node:20-alpine AS base
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./

#  deps 
FROM base AS deps
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile && pnpm prisma generate

# builder
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# dev 
FROM base AS development
COPY --from=deps /app/node_modules ./node_modules
COPY . .
CMD ["pnpm", "dev"]

# production
FROM node:20-alpine AS production
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile && pnpm prisma generate
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
CMD ["node", "--env-file=.env", "dist/index.js"]
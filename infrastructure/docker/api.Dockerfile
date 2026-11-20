# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
# OpenSSL is required by the Prisma query engine.
RUN corepack enable && apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /repo

FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @young-owl/shared build \
 && pnpm --filter @young-owl/database build \
 && pnpm --filter @young-owl/api build

# Runtime keeps the workspace node_modules (pnpm symlinks + generated Prisma client).
# TODO(Phase 5): slim this image with a production-only install.
FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build --chown=node:node /repo /repo
WORKDIR /repo/apps/api
USER node
EXPOSE 4000
CMD ["node", "dist/server.js"]

# One-off job: apply migrations (and optionally seed) against the database.
FROM node:22-bookworm-slim
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable && apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile && pnpm --filter @young-owl/shared build && pnpm --filter @young-owl/database generate
WORKDIR /repo/packages/database
CMD ["sh", "-c", "npx prisma migrate deploy && if [ \"$SEED\" = \"true\" ]; then npx tsx prisma/seed.ts; fi"]

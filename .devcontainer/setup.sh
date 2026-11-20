#!/usr/bin/env bash
# Runs once when the codespace is created: install, build, migrate and seed dummy data.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  cp .env.example .env
  sed -i 's|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=youngowl|' .env
  sed -i 's|^DATABASE_URL=.*|DATABASE_URL=postgresql://youngowl:youngowl@localhost:5432/youngowl|' .env
fi
set -a; . ./.env; set +a

corepack enable
corepack prepare pnpm@10.28.0 --activate
pnpm install --frozen-lockfile

echo "Waiting for PostgreSQL..."
for i in $(seq 1 60); do
  node -e "require('net').connect(5432,'127.0.0.1').on('connect',()=>process.exit(0)).on('error',()=>process.exit(1))" && break
  sleep 1
done

pnpm --filter @young-owl/shared build
pnpm --filter @young-owl/database build
pnpm --filter @young-owl/database migrate:deploy
pnpm db:seed
pnpm --filter @young-owl/api build
pnpm --filter @young-owl/web build
echo "Setup done."

#!/usr/bin/env bash
# Runs every time the codespace starts: launch API (:4000) and web (:3000) in the background.
# Production builds are used so the app works behind the Codespaces port-forwarding proxy.
set -uo pipefail
cd "$(dirname "$0")/.."
set -a; . ./.env; set +a
mkdir -p .devcontainer/logs

pkill -f "node dist/server.js" 2>/dev/null || true
pkill -f "next start" 2>/dev/null || true

(cd apps/api && nohup node dist/server.js > ../../.devcontainer/logs/api.log 2>&1 &)
(cd apps/web && nohup npx next start -p 3000 > ../../.devcontainer/logs/web.log 2>&1 &)

echo "Young Owl is starting. Open the 'Ports' tab and click the globe icon on port 3000."
echo "Login: admin@youngowl.lab / ${SEED_ADMIN_PASSWORD:-Owl-Admin-2026!}"
echo "Logs: .devcontainer/logs/"

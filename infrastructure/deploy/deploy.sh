#!/usr/bin/env bash
# Young Owl — one-command deploy for a standalone VPS.
# Brings up the normal (secure) stack, and optionally the vulnerable lab stack.
#
#   bash infrastructure/deploy/deploy.sh            # normal app only
#   bash infrastructure/deploy/deploy.sh --with-lab # normal app + vulnerable lab
#
# Prereqs: Docker + the Compose plugin, and a .env created from .env.example with strong secrets.
set -euo pipefail
cd "$(dirname "$0")/../.."

WITH_LAB=0
[ "${1:-}" = "--with-lab" ] && WITH_LAB=1

if [ ! -f .env ]; then
  echo "No .env found. Copy .env.example to .env and set strong secrets first." >&2
  exit 1
fi

# Shared, one-way volume for the attack monitor: the lab writes attack events, the control center
# reads them. Safe to run every time; it is a no-op once the volume exists.
echo "==> Ensuring the attack-monitor volume exists"
docker volume create youngowl_monitor >/dev/null

echo "==> Building and starting the main stack (postgres, redis, api, web on 127.0.0.1:3000)"
# First run seeds the dummy data; set SEED_ON_START=true in .env for the very first start.
docker compose up -d --build

if [ "$WITH_LAB" = 1 ]; then
  echo "==> Building and starting the vulnerable LAB stack (public, isolated)"
  docker compose -f docker-compose.lab.yml -p youngowl-lab up -d --build
  echo "==> Applying lab egress firewall"
  if [ "$(id -u)" -ne 0 ]; then
    echo "   (needs root) run: sudo bash infrastructure/lab/firewall.sh"
  else
    bash infrastructure/lab/firewall.sh
  fi
fi

echo
echo "Done."
echo "  Control center : http://127.0.0.1:3000 (put Nginx+HTTPS in front, or SSH-tunnel)"
[ "$WITH_LAB" = 1 ] && echo "  Lab target     : http://<vps-ip>:${LAB_PORT:-8080}  (attack this from Kali)"

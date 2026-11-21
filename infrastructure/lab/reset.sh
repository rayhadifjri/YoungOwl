#!/usr/bin/env bash
# Throws away the lab copy (database, files, anything an attacker changed) and starts it fresh.
# Example cron on the VPS, every 6 hours:
#   0 */6 * * * cd /opt/YoungOwl && bash infrastructure/lab/reset.sh >> /var/log/youngowl-lab-reset.log 2>&1
set -euo pipefail
cd "$(dirname "$0")/../.."
docker compose -f docker-compose.lab.yml -p youngowl-lab down --volumes --remove-orphans
docker compose -f docker-compose.lab.yml -p youngowl-lab up -d
bash infrastructure/lab/firewall.sh
echo "Lab reset at $(date -Is)"

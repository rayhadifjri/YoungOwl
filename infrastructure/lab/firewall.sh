#!/usr/bin/env bash
# Blocks the lab copy from starting connections out of its network (to the internet, the host,
# or anything else), while still answering the people who attack it on the published port.
# Run on the VPS as root after the lab stack is up, and again after each reboot.
set -euo pipefail
SUBNET="${LAB_SUBNET:-172.31.250.0/24}"

add() { iptables -C "$@" 2>/dev/null || iptables -I "$@"; }

# Forwarded traffic (to the internet or other Docker networks): drop new connections.
add DOCKER-USER -s "$SUBNET" -m conntrack --ctstate NEW -j DROP
# Traffic to the VPS itself (SSH, other services on the host): drop new connections.
add INPUT -s "$SUBNET" -m conntrack --ctstate NEW -j DROP

echo "Outbound connections from $SUBNET are blocked."

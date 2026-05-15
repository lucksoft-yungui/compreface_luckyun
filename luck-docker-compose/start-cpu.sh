#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

PROJECT_NAME="${COMPOSE_PROJECT_NAME:-luck-compreface}"
CORE_CPU_VERSION="$(grep -E '^CORE_CPU_VERSION=' .env | tail -1 | cut -d '=' -f2-)"
REGISTRY="$(grep -E '^registry=' .env | tail -1 | cut -d '=' -f2-)"

echo "Starting CompreFace with CPU core..."
docker compose \
  --env-file .env \
  -p "$PROJECT_NAME" \
  -f docker-compose.yml \
  rm -sf compreface-core-gpu >/dev/null 2>&1 || true

COMPOSE_PROFILES=cpu docker compose \
  --env-file .env \
  -p "$PROJECT_NAME" \
  -f docker-compose.yml \
  up -d --remove-orphans

echo "CPU core image: ${REGISTRY:-exadel/}compreface-core:${CORE_CPU_VERSION:-1.2.0-arcface-r100}"

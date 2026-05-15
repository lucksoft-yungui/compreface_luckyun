#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

PROJECT_NAME="${COMPOSE_PROJECT_NAME:-luck-compreface}"
CORE_GPU_VERSION="$(grep -E '^CORE_GPU_VERSION=' .env | tail -1 | cut -d '=' -f2-)"
REGISTRY="$(grep -E '^registry=' .env | tail -1 | cut -d '=' -f2-)"

echo "Starting CompreFace with GPU core..."
docker compose \
  --env-file .env \
  -p "$PROJECT_NAME" \
  -f docker-compose.yml \
  rm -sf compreface-core-cpu >/dev/null 2>&1 || true

COMPOSE_PROFILES=gpu docker compose \
  --env-file .env \
  -p "$PROJECT_NAME" \
  -f docker-compose.yml \
  up -d --remove-orphans

echo "GPU core image: ${REGISTRY:-exadel/}compreface-core:${CORE_GPU_VERSION:-1.2.0-arcface-r100-gpu}"

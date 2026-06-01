#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

if [[ ! -f .env ]]; then
  echo "[ERROR] .env 不存在"
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

MODE="${1:-${COMPOSE_PROFILES:-cpu}}"
USE_INTERNAL_POSTGRES="${USE_INTERNAL_POSTGRES:-false}"
PROJECT_NAME="${COMPOSE_PROJECT_NAME:-luck-compreface}"
NETWORK_NAME="${DOCKER_NETWORK_NAME:-${PROJECT_NAME}-net}"

if [[ "$MODE" != "cpu" && "$MODE" != "gpu" ]]; then
  echo "[ERROR] 启动模式仅支持 cpu 或 gpu，当前: $MODE"
  exit 1
fi

REGISTRY="${registry:-exadel/}"
BACKEND_REGISTRY="${backend_registry:-}"
UI_REGISTRY="${ui_registry:-}"

ADMIN_IMAGE="${BACKEND_REGISTRY}compreface-admin:${ADMIN_VERSION}"
API_IMAGE="${BACKEND_REGISTRY}compreface-api:${API_VERSION}"
UI_IMAGE="${UI_REGISTRY}luck-ui:${UI_VERSION}"
POSTGRES_IMAGE="${REGISTRY}compreface-postgres-db:${POSTGRES_VERSION}"

if [[ "$MODE" == "cpu" ]]; then
  CORE_IMAGE="${REGISTRY}compreface-core:${CORE_CPU_VERSION}"
else
  CORE_IMAGE="${REGISTRY}compreface-core:${CORE_GPU_VERSION}"
fi

remove_if_exists() {
  local name="$1"
  docker rm -f "$name" >/dev/null 2>&1 || true
}

echo "[INFO] 使用网络: ${NETWORK_NAME}"
docker network create "${NETWORK_NAME}" >/dev/null 2>&1 || true

echo "[INFO] 清理旧容器"
remove_if_exists compreface-postgres-db
remove_if_exists compreface-admin
remove_if_exists compreface-api
remove_if_exists compreface-core
remove_if_exists luck-ui

if [[ "${USE_INTERNAL_POSTGRES}" == "true" ]]; then
  echo "[INFO] 启动内置 PostgreSQL: ${POSTGRES_IMAGE}"
  docker run -d \
    --name compreface-postgres-db \
    --restart always \
    --network "${NETWORK_NAME}" \
    -p 5432:5432 \
    -e POSTGRES_USER="${postgres_username}" \
    -e POSTGRES_PASSWORD="${postgres_password}" \
    -e POSTGRES_DB="${postgres_db}" \
    -v "${postgres_storage_path}:/var/lib/postgresql/data" \
    "${POSTGRES_IMAGE}"
fi

echo "[INFO] 启动 compreface-api: ${API_IMAGE}"
docker run -d \
  --name compreface-api \
  --restart always \
  --network "${NETWORK_NAME}" \
  -p 8082:8080 \
  --add-host host.docker.internal:host-gateway \
  -e POSTGRES_USER="${postgres_username}" \
  -e POSTGRES_PASSWORD="${postgres_password}" \
  -e POSTGRES_URL="jdbc:postgresql://${postgres_host}:${postgres_port}/${postgres_db}" \
  -e SPRING_PROFILES_ACTIVE="dev" \
  -e API_JAVA_OPTS="${compreface_api_java_options}" \
  -e SAVE_IMAGES_TO_DB="${save_images_to_db}" \
  -e MAX_FILE_SIZE="${max_file_size}" \
  -e MAX_REQUEST_SIZE="${max_request_size}B" \
  -e CONNECTION_TIMEOUT="${connection_timeout:-10000}" \
  -e READ_TIMEOUT="${read_timeout:-60000}" \
  "${API_IMAGE}"

echo "[INFO] 启动 compreface-admin: ${ADMIN_IMAGE}"
docker run -d \
  --name compreface-admin \
  --restart always \
  --network "${NETWORK_NAME}" \
  -p 8081:8080 \
  --add-host host.docker.internal:host-gateway \
  -e POSTGRES_USER="${postgres_username}" \
  -e POSTGRES_PASSWORD="${postgres_password}" \
  -e POSTGRES_URL="jdbc:postgresql://${postgres_host}:${postgres_port}/${postgres_db}" \
  -e SPRING_PROFILES_ACTIVE="dev" \
  -e ENABLE_EMAIL_SERVER="${enable_email_server}" \
  -e EMAIL_HOST="${email_host}" \
  -e EMAIL_USERNAME="${email_username}" \
  -e EMAIL_FROM="${email_from}" \
  -e EMAIL_PASSWORD="${email_password}" \
  -e ADMIN_JAVA_OPTS="${compreface_admin_java_options}" \
  -e MAX_FILE_SIZE="${max_file_size}" \
  -e MAX_REQUEST_SIZE="${max_request_size}B" \
  "${ADMIN_IMAGE}"

if [[ "$MODE" == "cpu" ]]; then
  echo "[INFO] 启动 compreface-core (CPU): ${CORE_IMAGE}"
  docker run -d \
    --name compreface-core \
    --restart always \
    --network "${NETWORK_NAME}" \
    -p 3000:3000 \
    --health-cmd 'curl --fail http://localhost:3000/healthcheck || exit 1' \
    --health-interval 10s \
    --health-timeout 1s \
    --health-retries 1 \
    -e ML_PORT=3000 \
    -e IMG_LENGTH_LIMIT="${max_detect_size}" \
    -e UWSGI_PROCESSES="${uwsgi_processes:-2}" \
    -e UWSGI_THREADS="${uwsgi_threads:-1}" \
    "${CORE_IMAGE}"
else
  echo "[INFO] 启动 compreface-core (GPU): ${CORE_IMAGE}"
  docker run -d \
    --name compreface-core \
    --restart always \
    --network "${NETWORK_NAME}" \
    -p 3000:3000 \
    --gpus all \
    --health-cmd 'curl --fail http://localhost:3000/healthcheck || exit 1' \
    --health-interval 10s \
    --health-timeout 1s \
    --health-retries 1 \
    -e ML_PORT=3000 \
    -e IMG_LENGTH_LIMIT="${max_detect_size}" \
    -e UWSGI_PROCESSES="${uwsgi_processes:-2}" \
    -e UWSGI_THREADS="${uwsgi_threads:-1}" \
    -e GPU_IDX="${CORE_GPU_IDX:-0}" \
    "${CORE_IMAGE}"
fi

echo "[INFO] 启动 luck-ui: ${UI_IMAGE}"
docker run -d \
  --name luck-ui \
  --restart always \
  --network "${NETWORK_NAME}" \
  -p 8000:80 \
  -e ADMIN_UPSTREAM="${luck_ui_admin_upstream:-http://compreface-admin:8080/admin}" \
  -e API_UPSTREAM="${luck_ui_api_upstream:-http://compreface-api:8080}" \
  -e CORE_UPSTREAM="${luck_ui_core_upstream:-http://compreface-core:3000}" \
  "${UI_IMAGE}"

echo "[OK] 启动完成，模式: ${MODE}"
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}' | (head -n 1; rg 'compreface-|luck-ui' || true)

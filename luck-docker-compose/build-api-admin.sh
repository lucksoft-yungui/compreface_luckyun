#!/usr/bin/env bash
set -euo pipefail

# Allow running with `sh build-api-admin.sh` by re-execing under bash.
if [ -z "${BASH_VERSION:-}" ]; then
  exec bash "$0" "$@"
fi

cd "$(dirname "$0")"

read_env() {
  local key="$1"
  grep -E "^${key}=" .env | tail -1 | cut -d '=' -f2- | sed 's/[[:space:]]*#.*$//' | xargs
}

normalize_registry() {
  local value="$1"
  value="${value#http://}"
  value="${value#https://}"
  [[ "${value}" == */ ]] || value="${value}/"
  echo "${value}"
}

update_env_value() {
  local key="$1"
  local value="$2"
  if grep -qE "^${key}=" .env; then
    sed -i.bak -E "s#^${key}=.*#${key}=${value}#" .env
  else
    printf '%s=%s\n' "${key}" "${value}" >> .env
  fi
}

select_registry() {
  local default_registry
  default_registry="$(read_env backend_registry)"
  default_registry="${default_registry:-exadel/}"

  echo "请选择镜像仓库地址：" >&2
  echo "  1) 10.10.10.203:30000" >&2
  echo "  2) 10.10.10.52:4000" >&2
  echo "  3) 手动输入" >&2
  echo "  4) 使用当前 .env 配置: ${default_registry}" >&2
  read -r -p "请输入选项 [1-4，默认 4]: " choice

  case "${choice:-4}" in
    1) echo "10.10.10.203:30000" ;;
    2) echo "10.10.10.52:4000" ;;
    3)
      read -r -p "请输入镜像仓库地址，例如 10.10.10.203:30000: " custom_registry
      echo "${custom_registry}"
      ;;
    4) echo "${default_registry}" ;;
    *)
      echo "无效选项: ${choice}" >&2
      exit 1
      ;;
  esac
}

select_version() {
  local default_version
  default_version="$(read_env LOCAL_IMAGE_VERSION)"
  default_version="${default_version:-1.2.0-luck}"
  read -r -p "请输入镜像版本号 [默认 ${default_version}]: " version
  echo "${version:-${default_version}}"
}

if [[ $# -ge 2 ]]; then
  REGISTRY_INPUT="$1"
  VERSION="$2"
else
  REGISTRY_INPUT="$(select_registry)"
  VERSION="$(select_version)"
fi

BACKEND_REGISTRY="$(normalize_registry "${REGISTRY_INPUT}")"
ND4J_CLASSIFIER_VALUE="${ND4J_CLASSIFIER:-$(read_env ND4J_CLASSIFIER)}"

API_IMAGE="${BACKEND_REGISTRY}compreface-api:${VERSION}"
ADMIN_IMAGE="${BACKEND_REGISTRY}compreface-admin:${VERSION}"

echo
echo "即将构建 CompreFace API/Admin 镜像："
echo "  API:   ${API_IMAGE}"
echo "  Admin: ${ADMIN_IMAGE}"
if [[ -n "${ND4J_CLASSIFIER_VALUE}" ]]; then
  echo "  ND4J_CLASSIFIER: ${ND4J_CLASSIFIER_VALUE}"
fi
read -r -p "确认开始构建？[Y/n]: " confirm
if [[ "${confirm:-Y}" != "Y" && "${confirm:-Y}" != "y" ]]; then
  echo "已取消。"
  exit 0
fi

docker build \
  --file ../dev/Dockerfile \
  --target frs_core \
  --build-arg "ND4J_CLASSIFIER=${ND4J_CLASSIFIER_VALUE}" \
  --tag "${API_IMAGE}" \
  ../java

docker build \
  --file ../dev/Dockerfile \
  --target frs_crud \
  --build-arg "ND4J_CLASSIFIER=${ND4J_CLASSIFIER_VALUE}" \
  --tag "${ADMIN_IMAGE}" \
  ../java

update_env_value backend_registry "${BACKEND_REGISTRY}"
update_env_value API_VERSION "${VERSION}"
update_env_value ADMIN_VERSION "${VERSION}"
update_env_value LOCAL_IMAGE_VERSION "${VERSION}"

echo
echo "构建完成，并已更新 .env："
echo "  backend_registry=${BACKEND_REGISTRY}"
echo "  API_VERSION=${VERSION}"
echo "  ADMIN_VERSION=${VERSION}"

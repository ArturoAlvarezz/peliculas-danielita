#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  printf 'Usage: %s <dockerhub-user>\n' "$0" >&2
  exit 1
fi

DOCKERHUB_USER="$1"
IMAGE_NAME="${IMAGE_NAME:-${DOCKERHUB_USER}/peliculas-danielita}"
VERSION="${VERSION:-latest}"
PLATFORMS="${PLATFORMS:-linux/amd64,linux/arm64}"
VITE_API_URL="${VITE_API_URL:-__SAME_ORIGIN__}"

docker buildx inspect --bootstrap
docker buildx build \
  --platform "$PLATFORMS" \
  -f Dockerfile \
  --build-arg "VITE_API_URL=${VITE_API_URL}" \
  -t "${IMAGE_NAME}:${VERSION}" \
  --push \
  .

printf 'Published %s:%s for %s\n' "$IMAGE_NAME" "$VERSION" "$PLATFORMS"

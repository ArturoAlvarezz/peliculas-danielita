#!/usr/bin/env bash
set -euo pipefail

IMAGE_NAME="${IMAGE_NAME:-peliculas-danielita}"
VITE_API_URL="${VITE_API_URL:-__SAME_ORIGIN__}"

docker build \
  -f Dockerfile \
  --build-arg "VITE_API_URL=${VITE_API_URL}" \
  -t "${IMAGE_NAME}:latest" \
  .

printf 'Built %s:latest\n' "$IMAGE_NAME"
printf 'Run with: docker run --rm -p 3000:3000 -v peliculas-data:/app/data -e OMDB_API_KEY="$OMDB_API_KEY" -e TMDB_API_KEY="$TMDB_API_KEY" -e WATCH_REGION="${WATCH_REGION:-CL}" %s:latest\n' "$IMAGE_NAME"

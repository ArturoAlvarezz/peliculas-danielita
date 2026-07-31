# Agent Guide

## Structure

- This is a single-package pnpm project, not a workspace. The Preact app starts at `src/main.tsx` and the Express API is the independent runtime in `server/server.js`.
- `src/config.ts` resolves `VITE_API_URL`; use an API origin without `/api`, or `__SAME_ORIGIN__` for the unified image. Without an override during Vite development, the frontend uses the production backend.
- Movie search goes through `GET /api/movies/search`; the Express server proxies OMDb at `https://www.omdbapi.com/` using the server-only `OMDB_API_KEY` environment variable.
- Platform availability goes through `GET /api/movies/providers/:imdbId`; the Express server proxies TMDB using `TMDB_API_KEY` and `WATCH_REGION`.
- The API reads and writes `${DATA_DIR}/data.json`. `DATA_DIR` defaults to `/app/data` for containers, so use a writable temporary path locally:
  `OMDB_API_KEY="$OMDB_API_KEY" TMDB_API_KEY="$TMDB_API_KEY" WATCH_REGION=CL DATA_DIR=/tmp/peliculas-danielita-data pnpm dev:server`.
- The tracked `server/data.json` is only used when `DATA_DIR` points to `server`; the server's default fallback data is defined separately in `getInitialData()` in `server/server.js`.

## Commands

- Install with the locked toolchain: `pnpm install --frozen-lockfile` (`package.json` pins pnpm 10.12.1).
- Run the frontend with `pnpm dev`. For local API integration, run it as `VITE_API_URL=http://localhost:3000 pnpm dev` in a second terminal alongside the backend command above.
- Build and typecheck with `pnpm build`; this runs `tsc -b` before `vite build`. TypeScript is strict and rejects unused locals/parameters.
- Use `pnpm preview` to serve the built frontend.
- No test, lint, or formatter scripts are configured. The GitHub workflow in `.github/workflows/deploy.yml` is for Docker deployment, not application tests.

## Docker

- `Dockerfile` is the canonical single-image deployment: Express serves both the API and the built frontend on port 3000. Its default `VITE_API_URL=__SAME_ORIGIN__` makes browser requests use the public origin.
- For local testing, build and run the image with `./docker-build.sh`; do not wait for CI or publish commits/images unless the user explicitly requests a push.
- Build the unified image with `./docker-build.sh`; publish multi-architecture images with `./docker-deploy.sh <dockerhub-user>` (requires Docker Buildx and Docker Hub login). Set `PLATFORMS=linux/arm64` for ARM-only publishing.
- The unified image persists `/app/data`; run it with `-v peliculas-data:/app/data -e OMDB_API_KEY="$OMDB_API_KEY"`. The API reads and writes `/app/data/data.json`.
- Set `OMDB_API_KEY` and `TMDB_API_KEY` on the backend/container at runtime; do not put either key in `VITE_*` variables or committed frontend files.
- `WATCH_REGION` defaults to `CL` and controls the country used for streaming availability. TMDB provider data is powered by JustWatch and must be attributed in the UI.
- `nginx-server-config.conf` is the reverse-proxy configuration for the unified image: proxy the whole site to `localhost:3000`.
- `docker-compose.yml` should use the unified image for local deployment. Keep the data volume persistent and pass `OMDB_API_KEY` through the environment.
- `Dockerfile.backend`, `Dockerfile.frontend`, and the `*-separated.sh` scripts remain legacy two-image workflows.
- The GitHub deployment workflow requires `DOCKER_USERNAME` and `DOCKER_TOKEN` repository secrets.

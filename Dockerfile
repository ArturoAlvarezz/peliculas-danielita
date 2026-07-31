# Unified image: build the Preact app and serve it from the Express API.
FROM --platform=$BUILDPLATFORM node:20-alpine AS builder

RUN npm install --global pnpm@10.12.1

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

# The frontend calls the API on the same public origin by default.
ARG VITE_API_URL=__SAME_ORIGIN__
ENV VITE_API_URL=${VITE_API_URL}
RUN pnpm build

FROM node:20-alpine AS runtime

RUN npm install --global pnpm@10.12.1

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

# server.js must stay at /app so its relative dist path resolves correctly.
COPY server/server.js ./server.js
COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/app/data

RUN mkdir -p /app/data
VOLUME ["/app/data"]

EXPOSE 3000
CMD ["node", "server.js"]

# syntax=docker/dockerfile:1
#
# ValoTrak — Hono backend (apps/server)
#
# Build context MUST be the monorepo root (the server depends on the
# @valotrak/* workspace packages). In Dokploy set:
#   - Build Type      : Dockerfile
#   - Docker File     : apps/server/Dockerfile
#   - Docker Context  : .            (repo root)
#
# The server is compiled into a single self-contained binary with
# `bun build --compile`, so the runtime image carries no node_modules
# and no source — just the binary.

############################################
# 1. Build — install the workspace and compile the server to a binary
############################################
FROM oven/bun:1.3.14 AS build
WORKDIR /app

# Manifests first, for a cacheable install layer. `bun install --frozen-lockfile`
# validates against bun.lock, so every workspace member must be present.
COPY package.json bun.lock ./
COPY apps/server/package.json        apps/server/package.json
COPY apps/web/package.json           apps/web/package.json
COPY packages/api/package.json       packages/api/package.json
COPY packages/auth/package.json      packages/auth/package.json
COPY packages/config/package.json    packages/config/package.json
COPY packages/db/package.json        packages/db/package.json
COPY packages/env/package.json       packages/env/package.json
COPY packages/ui/package.json        packages/ui/package.json
COPY packages/valorant/package.json  packages/valorant/package.json

RUN bun install --frozen-lockfile

# Source needed to compile the server (web app source is not required).
COPY tsconfig.json tsconfig.json
COPY packages packages
COPY apps/server apps/server

# Bundle @valotrak/* + all npm deps + the Bun runtime into one executable.
# `export default app` (Hono) auto-serves and honours $PORT at runtime.
RUN cd apps/server \
 && bun build --compile --minify --sourcemap ./src/index.ts --outfile /app/server

############################################
# 2. Runtime — minimal image with only the binary
############################################
FROM oven/bun:1.3.14-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000

COPY --from=build /app/server /app/server

# oven/bun images ship a non-root `bun` user.
USER bun

EXPOSE 3000

# Lightweight healthcheck using the Bun runtime already in the image.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD bun -e "fetch('http://localhost:'+(process.env.PORT||3000)+'/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["/app/server"]

# syntax=docker/dockerfile:1

# Tanar prod image — Next.js standalone on Debian (glibc) for reliable sharp.
# Multi-stage:
#   deps    — npm ci (prebuilt sharp for linux-x64-glibc installs cleanly on slim)
#   builder — next build → .next/standalone (also the image for one-off tools:
#             migrate / seed / push-media, which need tsx + drizzle-kit + source)
#   runner  — minimal standalone runtime for the storefront + admin

# ---- deps ----------------------------------------------------------------
FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- builder -------------------------------------------------------------
FROM node:20-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# force-dynamic catalog pages don't read the DB at build time, so build must
# succeed WITHOUT DATABASE_URL. If this fails on a missing url, something is
# importing the db client at build time — investigate, don't paper over it.
RUN npm run build
# Guard: fail the BUILD (not runtime) if the standalone artifact is missing —
# e.g. a Next/Turbopack regression that stops emitting it.
RUN test -f .next/standalone/server.js

# ---- runner --------------------------------------------------------------
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# gosu lets the entrypoint chown the photos volume as root, then drop to `node`.
RUN apt-get update \
  && apt-get install -y --no-install-recommends gosu \
  && rm -rf /var/lib/apt/lists/*

# standalone does NOT bundle public/ or .next/static — copy them in manually,
# plus content/ (blog MDX is read from disk at runtime).
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/content ./content

# Photos dir must exist so the entrypoint chown doesn't fail before the volume
# is mounted, and so a no-volume run still has a writable target.
RUN mkdir -p /app/public/images/products

COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

EXPOSE 3000

# entrypoint chowns the photos volume (as root) then execs `gosu node node server.js`
ENTRYPOINT ["/app/docker-entrypoint.sh"]

# syntax=docker/dockerfile:1.7

# ─── Builder ─────────────────────────────────────────────────────────────
# Full toolchain: needs python + make + g++ for bcrypt's native build,
# and openssl for Prisma's binary engine detection.
FROM node:22-alpine AS builder
WORKDIR /app

RUN apk add --no-cache python3 make g++ openssl libc6-compat

# Install all deps (including dev) — needed for the build.
COPY package.json package-lock.json ./
RUN npm ci

# Copy the prisma schema before running `prisma generate` so the client
# is baked into node_modules and survives the runner-stage prune.
COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig*.json nest-cli.json ./
COPY src ./src

RUN npm run build

# Drop dev dependencies for the runner image. Note: `prisma generate`
# left its output inside node_modules/.prisma — that survives the prune.
RUN npm prune --omit=dev


# ─── Runner ──────────────────────────────────────────────────────────────
# Minimal runtime — only openssl (Prisma) and libc6-compat (Node native
# bindings on alpine). No compilers.
FROM node:22-alpine AS runner
WORKDIR /app

RUN apk add --no-cache openssl libc6-compat

ENV NODE_ENV=production
ENV PORT=5000

# Non-root user for defense-in-depth.
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001 -G nodejs

COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./package.json

USER nestjs

EXPOSE 5000

# Apply any pending schema migrations before serving requests. Fails
# fast if the DB is unreachable or a migration errors — Railway marks
# the deploy failed and keeps the old container serving traffic.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main"]

# ─── Stage 1: Build the Vite frontend ─────────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

# Install dependencies first (layer cache)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# ─── Stage 2: Production runtime ───────────────────────────────────────────────
FROM node:20-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8787
ENV HOST=0.0.0.0

# Install only production dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy built frontend assets
COPY --from=build /app/dist ./dist

# Copy backend source files
COPY --from=build /app/backend/server.js   ./backend/server.js
COPY --from=build /app/backend/store.js    ./backend/store.js
COPY --from=build /app/backend/seedData.js ./backend/seedData.js

# backend/data and backend/uploads are created at runtime by ensureStorage().
# Mount a Docker volume over /app/backend/data and /app/backend/uploads
# in production to persist user data across container restarts.

EXPOSE 8787

# Healthcheck – hits the /api/health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:8787/api/health || exit 1

CMD ["node", "backend/server.js"]

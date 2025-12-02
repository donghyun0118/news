# ---------- Build stage ----------
FROM node:22-slim AS builder
WORKDIR /app

# Install **all** dependencies (dev + prod) for TypeScript compilation
# Context is Repo Root, so we copy from news-server/
COPY news-server/package*.json ./
RUN npm ci

# Copy server source code
COPY news-server/ .
RUN npm run build

# ---------- Runtime stage ----------
FROM node:22-slim AS runtime
WORKDIR /app

# Install Python 3 and dependencies (Debian-based)
# Removed build-essential to save time (wheels should exist for Debian)
RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 python3-pip python3-venv && \
    rm -rf /var/lib/apt/lists/*

# Copy compiled output
COPY --from=builder /app/dist ./dist
# Copy source files needed by Swagger (routes, config, etc.)
COPY --from=builder /app/src ./src
# Copy public assets (avatars, etc.)
COPY --from=builder /app/public ./public

# Copy python scripts (from Repo Root context)
COPY news-data /news-data

# Install Python dependencies
# 1. Install CPU-only PyTorch first (Huge speedup: ~800MB vs ~2GB+)
# 2. Then install other dependencies
RUN pip3 install --break-system-packages torch --index-url https://download.pytorch.org/whl/cpu && \
    pip3 install --break-system-packages -r /news-data/requirements.txt

# Install only production dependencies
COPY news-server/package*.json ./
RUN npm ci --only=production

EXPOSE 3000
CMD ["node", "dist/app.js"]
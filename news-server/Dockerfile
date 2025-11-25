# syntax=docker/dockerfile:1.4   # BuildKit 캐시 사용 (Render 기본 활성화)

# ---------- Build stage ----------
FROM node:22-slim AS builder
WORKDIR /app

# Install **all** dependencies (dev + prod) for TypeScript compilation
# Context is Repo Root, so we copy from news-server/
COPY news-server/package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# Copy server source code
COPY news-server/ .
RUN npm run build

# ---------- Runtime stage ----------
FROM node:22-slim AS runtime
WORKDIR /app

# Install Python 3 and dependencies (Debian-based)
# python3-full is often needed for venv/pip on newer Debian versions, or just python3-pip
RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 python3-pip python3-venv build-essential && \
    rm -rf /var/lib/apt/lists/*

# Copy compiled output
COPY --from=builder /app/dist ./dist
# Copy source files needed by Swagger (routes, config, etc.)
COPY --from=builder /app/src ./src

# Copy python scripts (from Repo Root context)
COPY news-data /news-data

# Install Python dependencies
# Using --break-system-packages is necessary on newer Debian/Ubuntu as they enforce PEP 668
RUN pip3 install --no-cache-dir --break-system-packages -r /news-data/requirements.txt

# Install only production dependencies
COPY news-server/package*.json ./
RUN npm ci --only=production

EXPOSE 3000
CMD ["node", "dist/app.js"]
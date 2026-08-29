# ==============================================================================
# HomePrint OS — Multi-Stage Production Dockerfile (ARM64 / Raspberry Pi 4 Ready)
# Builds high-performance, local-first print shop server with headless LibreOffice,
# CUPS network printer client, Sharp libvips, and pre-compiled Vue 3 SPA.
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build Vue 3 Frontend SPA
# ------------------------------------------------------------------------------
FROM node:20-bookworm-slim AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Build Fastify Backend TypeScript
# ------------------------------------------------------------------------------
FROM node:20-bookworm-slim AS backend-builder
WORKDIR /app/backend

# Install python and build tools for native compilation if required
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ gcc \
    && rm -rf /var/lib/apt/lists/*

COPY backend/package*.json ./
RUN npm ci

COPY backend/ ./
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 3: Production Runtime
# ------------------------------------------------------------------------------
FROM node:20-bookworm-slim AS runner

# Install headless LibreOffice, full CUPS daemon & drivers, HPLIP, Poppler, networking tools, and fonts
RUN apt-get update && apt-get install -y --no-install-recommends \
    cups \
    cups-client \
    cups-bsd \
    cups-filters \
    cups-ipp-utils \
    hplip \
    printer-driver-hpcups \
    libreoffice-writer-nogui \
    libreoffice-impress-nogui \
    libreoffice-calc-nogui \
    poppler-utils \
    iputils-ping \
    net-tools \
    iproute2 \
    curl \
    fonts-liberation2 \
    fonts-dejavu-core \
    fonts-freefont-ttf \
    sqlite3 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Configure CUPS client to use the mounted host CUPS socket
# The host must run CUPS (see docs/host-cups-setup.md)
RUN echo "ServerName /run/cups/cups.sock" > /etc/cups/client.conf

WORKDIR /app

# Install production dependencies only (with Sharp and better-sqlite3 native bindings)
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --omit=dev

# Copy compiled backend output
COPY --from=backend-builder /app/backend/dist ./backend/dist
COPY backend/src/db/schema.sql ./backend/src/db/schema.sql

# Copy compiled frontend assets into Fastify public distribution directory
COPY --from=frontend-builder /app/backend/dist/public ./backend/dist/public

# Setup persistent data and cache directories
RUN mkdir -p /data /app/cache/converted /app/cache/spool

# Environment Defaults
ENV NODE_ENV=production
ENV PORT=5000
ENV DATABASE_PATH=/data/homeprint.sqlite

EXPOSE 5000

VOLUME ["/data"]

WORKDIR /app/backend
# No internal cupsd — submit jobs to host CUPS via /run/cups/cups.sock
CMD ["node", "dist/server.js"]



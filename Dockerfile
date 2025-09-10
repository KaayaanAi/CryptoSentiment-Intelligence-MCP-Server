# Multi-stage build for production optimization
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Install dependencies for native modules
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci && npm cache clean --force

# Copy source code
COPY src/ ./src/

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S crypto-sentiment -u 1001 -G nodejs

# Set working directory
WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache \
    tini \
    dumb-init \
    curl \
    && rm -rf /var/cache/apk/*

# Copy built application from builder stage
COPY --from=builder --chown=crypto-sentiment:nodejs /app/build ./build
COPY --from=builder --chown=crypto-sentiment:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=crypto-sentiment:nodejs /app/package.json ./package.json

# Create logs directory
RUN mkdir -p logs && chown crypto-sentiment:nodejs logs

# Switch to non-root user
USER crypto-sentiment

# Expose port
EXPOSE 4004

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:4004/health || exit 1

# Set environment variables
ENV NODE_ENV=production
ENV PORT=4004
ENV HOST=0.0.0.0

# Use tini for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]

# Default command (can be overridden)
CMD ["node", "build/index.js"]

# Metadata
LABEL maintainer="Kaayaan AI Infrastructure" \
      version="1.0.0" \
      description="CryptoSentiment Intelligence MCP Server" \
      org.opencontainers.image.source="https://github.com/kaayaan-ai/crypto-sentiment-intelligence-mcp-server"
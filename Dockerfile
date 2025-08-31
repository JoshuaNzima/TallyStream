# Multi-stage Docker build for PTC System
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Install system dependencies
RUN apk add --no-cache postgresql-client

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S ptc -u 1001

# Set working directory
WORKDIR /app

# Copy built application from builder stage
COPY --from=builder --chown=ptc:nodejs /app/dist ./dist
COPY --from=builder --chown=ptc:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=ptc:nodejs /app/server ./server
COPY --from=builder --chown=ptc:nodejs /app/shared ./shared
COPY --from=builder --chown=ptc:nodejs /app/package*.json ./

# Create necessary directories
RUN mkdir -p uploads logs && chown ptc:nodejs uploads logs

# Switch to non-root user
USER ptc

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1

# Start the application
CMD ["npm", "start"]
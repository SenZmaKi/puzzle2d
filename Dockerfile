# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy shared constants
COPY shared/ ./shared/

# Install client deps and build
COPY client/package*.json ./client/
RUN cd client && npm install

COPY client/ ./client/
RUN cd client && npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy shared constants
COPY shared/ ./shared/

# Install server deps
COPY server/package*.json ./server/
RUN cd server && npm install --production

COPY server/ ./server/

# Copy built client
COPY --from=builder /app/client/dist ./client/dist

# Copy sounds directory (music/sfx assets added by user)
RUN mkdir -p /app/client/public/sounds
COPY client/public/sounds/ /app/client/public/sounds/

# Create directories for persistent data
RUN mkdir -p /app/server/uploads /app/data

EXPOSE 3001

ENV NODE_ENV=production
ENV PORT=3001
ENV DB_PATH=/app/data/puzzle2d.db

CMD ["node", "server/index.js"]

# Multi-stage build for React + Node.js backend

# Stage 1: Build React frontend
FROM node:20-alpine AS frontend-build

WORKDIR /app/frontend

# Copy frontend package files
COPY package*.json ./
COPY tsconfig.json ./
COPY vite.config.ts ./
COPY index.html ./

# Install frontend dependencies
RUN npm ci

# Copy frontend source code
COPY components ./components
COPY services ./services
COPY types.ts ./
COPY App.tsx ./
COPY index.tsx ./
COPY mockData.ts ./
COPY config ./config

# Build frontend
RUN npm run build

# Stage 2: Build backend
FROM node:20-alpine AS backend-build

WORKDIR /app/server

# Copy backend package files
COPY server/package*.json ./
COPY server/tsconfig.json ./

# Install backend dependencies
RUN npm ci

# Copy backend source code
COPY server/src ./src

# Build backend
RUN npm run build

# Stage 3: Production image
FROM node:20-alpine

WORKDIR /app

# Copy backend build and dependencies
COPY --from=backend-build /app/server/dist ./dist
COPY --from=backend-build /app/server/package*.json ./
COPY --from=backend-build /app/server/node_modules ./node_modules

# Copy frontend build to be served by backend
COPY --from=frontend-build /app/frontend/dist ./dist/public

# Expose port 8080 (Cloud Run requirement)
EXPOSE 8080

# Set environment to production
ENV NODE_ENV=production
ENV PORT=8080

# Start the server
CMD ["node", "dist/index.js"]

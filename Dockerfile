# Railway Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files first (for better caching)
COPY package*.json ./
COPY frontend/package*.json ./frontend/
COPY frontend/package-lock.json ./frontend/

# Install root dependencies (skip postinstall to avoid conflicts)
RUN npm install --production=false --ignore-scripts

# Install frontend dependencies with legacy peer deps to handle React 19
WORKDIR /app/frontend
RUN npm install --legacy-peer-deps

# Copy frontend source files BEFORE building
COPY frontend/ ./

# Build frontend
RUN npm run build

# Back to root
WORKDIR /app

# Copy all remaining files (server.js, etc.)
COPY . .

# Expose port
EXPOSE 3000

# Start server
CMD ["npm", "start"]

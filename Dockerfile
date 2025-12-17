# Railway Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files first (for better caching)
COPY package*.json ./
COPY frontend/package*.json ./frontend/
COPY frontend/package-lock.json ./frontend/

# Install root dependencies
RUN npm install --production=false

# Install frontend dependencies
WORKDIR /app/frontend
RUN npm install

# Build frontend
RUN npm run build

# Back to root
WORKDIR /app

# Copy all remaining files
COPY . .

# Expose port
EXPOSE 3000

# Start server
CMD ["npm", "start"]

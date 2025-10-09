# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Final stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (needed for development mode)
RUN npm ci

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Copy source code (needed for development hot reload)
COPY . .

# Copy and set permissions for start script
COPY start.sh ./
RUN chmod +x start.sh

# Expose the application port
EXPOSE 3000

# Run the application using start script
CMD ["./start.sh"]

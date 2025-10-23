#!/bin/sh

# Frontend startup script for Docker
# Generates API client from backend OpenAPI spec, then starts the application

echo "🚀 Starting frontend application..."
echo "📌 NODE_ENV: ${NODE_ENV}"

# Generate API client from backend OpenAPI spec
if [ -f "/app/backend-openapi.json" ]; then
    echo "📡 Generating API client from OpenAPI spec..."
    npm run generate:api
    if [ $? -eq 0 ]; then
        echo "✅ API client generated successfully!"
    else
        echo "❌ Failed to generate API client"
        exit 1
    fi
else
    echo "❌ OpenAPI spec not found at /app/backend-openapi.json"
    echo "❌ Cannot start frontend without API client"
    exit 1
fi

# Start the application based on environment
if [ "$NODE_ENV" = "development" ]; then
    echo "🔧 Running in DEVELOPMENT mode"
    npm run dev
else
    echo "🏭 Running in PRODUCTION mode"
    echo "🔨 Building application..."
    npm run build
    if [ $? -eq 0 ]; then
        echo "✅ Build completed successfully!"
        echo "🚀 Starting preview server..."
        npm run preview -- --host 0.0.0.0 --port 80
    else
        echo "❌ Build failed"
        exit 1
    fi
fi

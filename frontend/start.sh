#!/bin/sh

# Frontend startup script
# Generates API client from backend OpenAPI spec, then starts the application

echo "🚀 Starting frontend application..."
echo "📌 NODE_ENV: ${NODE_ENV}"

# Check for OpenAPI spec in multiple locations
OPENAPI_PATH=""
if [ -f "/app/backend-openapi.json" ]; then
    OPENAPI_PATH="/app/backend-openapi.json"
elif [ -f "../backend/openapi.json" ]; then
    OPENAPI_PATH="../backend/openapi.json"
fi

# Generate API client from backend OpenAPI spec
if [ -n "$OPENAPI_PATH" ]; then
    echo "📡 Generating API client from OpenAPI spec at: $OPENAPI_PATH"
    npm run generate:api
    if [ $? -eq 0 ]; then
        echo "✅ API client generated successfully!"
    else
        echo "❌ Failed to generate API client"
        exit 1
    fi
else
    echo "⚠️  Warning: OpenAPI spec not found"
    echo "⚠️  Checked locations:"
    echo "    - /app/backend-openapi.json (Docker)"
    echo "    - ../backend/openapi.json (Local)"
    echo "⚠️  Skipping API client generation. Using existing generated files."
fi

# Start the application based on environment
if [ "$NODE_ENV" = "development" ]; then
    echo "🔧 Running in DEVELOPMENT mode"
    npm run dev
else
    echo "🏭 Running in PRODUCTION mode"
    npm run preview
fi

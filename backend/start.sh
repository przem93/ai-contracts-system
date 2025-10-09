#!/bin/sh

# Backend startup script
# Checks NODE_ENV and runs the application with appropriate mode

echo "🚀 Starting backend application..."
echo "📌 NODE_ENV: ${NODE_ENV}"

if [ "$NODE_ENV" = "development" ]; then
    echo "🔧 Running in DEVELOPMENT mode with hot reload (watch mode)"
    npm run start:dev
else
    echo "🏭 Running in PRODUCTION mode"
    node dist/main
fi

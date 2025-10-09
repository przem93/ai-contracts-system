#!/bin/bash

# Development environment startup script with hot reload support
# This script starts the application in development mode with auto-refresh

echo "🔧 Starting AI Contracts System in DEVELOPMENT mode..."
echo "📝 Hot reload is ENABLED - changes will automatically refresh the backend"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  Warning: .env file not found. Creating from .env-example..."
    if [ -f .env-example ]; then
        cp .env-example .env
        echo "✅ Created .env file. Please configure it with your settings."
    else
        echo "❌ Error: .env-example not found. Please create .env manually."
        exit 1
    fi
fi

# Export NODE_ENV
export NODE_ENV=development

# Start services using both docker-compose files
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build

echo ""
echo "🛑 Development environment stopped"

#!/bin/bash

# Script to regenerate API client after backend changes
# This script should be run whenever the backend API changes during development

set -e

echo "🔄 Regenerating OpenAPI specification..."
cd backend
npm run generate:openapi
cd ..

echo "🔄 Regenerating frontend API client..."
cd frontend
npm run generate:api
cd ..

echo "✅ API client regenerated successfully!"

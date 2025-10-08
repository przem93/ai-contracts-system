# Nginx Reverse Proxy Setup

This document describes the nginx reverse proxy configuration for the AI Contract System.

## Architecture

The system uses an nginx reverse proxy to hide the backend services (Nest.js and Neo4j) behind a single entry point.

### Services

1. **proxy** (nginx:alpine)
   - External port: `80`
   - Routes requests to internal services
   - Acts as the single entry point for users

2. **backend** (Nest.js)
   - Internal port: `3000` (not exposed externally)
   - Accessible via proxy at: `http://localhost/api`

3. **graph-db** (Neo4j)
   - Internal ports: `7474` (HTTP), `7687` (Bolt) - not exposed externally
   - HTTP interface accessible via proxy at: `http://localhost/db`

### Network Configuration

All services communicate through an internal Docker network named `ai-contracts-network`. This ensures:
- Services can communicate with each other using service names as hostnames
- External access is only available through the proxy on port 80
- Direct access to backend and graph-db is blocked

## Routing Configuration

### /api - Backend API
- **URL**: `http://localhost/api`
- **Proxies to**: `backend:3000`
- **Example**: `http://localhost/api/health` → `http://backend:3000/health`

### /db - Neo4j Browser
- **URL**: `http://localhost/db`
- **Proxies to**: `graph-db:7474`
- **Example**: `http://localhost/db/browser` → `http://graph-db:7474/browser`

### /health - Proxy Health Check
- **URL**: `http://localhost/health`
- Returns: `healthy` (200 OK)
- Quick health check for the proxy itself

## Usage

### Starting the Services

```bash
docker compose up -d
```

### Accessing the Services

- **Backend API**: `http://localhost/api`
- **Neo4j Browser**: `http://localhost/db`
- **Proxy Health**: `http://localhost/health`

### Stopping the Services

```bash
docker compose down
```

### Viewing Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f proxy
docker compose logs -f backend
docker compose logs -f graph-db
```

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Neo4j Configuration
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_secure_password

# Optional: Node Environment
NODE_ENV=production
```

## Security Features

1. **No Direct Access**: Backend and database are not accessible directly from outside the Docker network
2. **Single Entry Point**: All external traffic must go through the nginx proxy
3. **Internal Network**: Services communicate via internal Docker network
4. **Health Checks**: All services have health checks to ensure proper startup sequence

## File Structure

```
.
├── docker-compose.yml          # Main compose configuration
├── nginx/
│   └── nginx.conf             # Nginx proxy configuration
├── backend/
│   ├── Dockerfile             # Backend container definition
│   └── ...                    # Nest.js application files
└── PROXY_SETUP.md             # This documentation
```

## Acceptance Criteria ✓

- ✓ Nest.js and Neo4j are hidden behind proxy container
- ✓ Proxy container is nginx
- ✓ User only connects with proxy container (port 80)
- ✓ Nest.js is visible only under `/api` url with port 80
- ✓ Neo4j is visible only under `/db` url with port 80
- ✓ Nest.js named as `backend` in docker-compose
- ✓ Neo4j named as `graph-db` in docker-compose
- ✓ Containers are visible for each other internally by internal network in docker

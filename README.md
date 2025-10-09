# AI Contracts System

AI coding agent contracts system powered by Neo4j graph database and NestJS backend.

## Tech Stack

- **Backend**: NestJS (TypeScript)
- **Database**: Neo4j Graph Database
- **Infrastructure**: Docker & Docker Compose

## Setup

1. Copy the environment configuration file:
   ```bash
   cp .env-example .env
   ```

2. Edit `.env` file and set your Neo4j password and other configurations

3. Run Docker Compose to start all services:
   ```bash
   docker-compose up -d
   ```

4. Wait for services to start (usually 30-60 seconds), then verify:
   - Backend API: http://localhost:3000
   - Backend Health: http://localhost:3000/health
   - Test Endpoint: http://localhost:3000/api/test
   - Neo4j Browser: http://localhost:7474

## Services

### Backend API (NestJS)

The backend API runs on port 3000 (configurable via `BACKEND_PORT` in `.env`).

**Available Endpoints:**

- `GET /` - Welcome message
- `GET /health` - Health check endpoint
- `GET /api/test` - Test endpoint (will be removed later)

### Neo4j Database

The Neo4j graph database runs on ports:
- **7474**: HTTP Browser interface
- **7687**: Bolt protocol for database connections

## Development

### Development Mode with Hot Reload

For active development with automatic backend refresh on code changes:

```bash
# Set NODE_ENV to development and start services
NODE_ENV=development docker-compose up --build
```

**Features in Development Mode:**
- ✅ Automatic backend refresh when source code changes
- ✅ Source code mounted as volumes for instant updates
- ✅ Only works when `NODE_ENV=development`
- ✅ No need to rebuild after code changes

**Note:** The hot reload feature uses NestJS's built-in watch mode (`--watch` flag) and only activates when `NODE_ENV` is set to `development`. The `start.sh` script automatically detects the environment and runs the appropriate command.

### Production Mode

For production deployment:

```bash
docker-compose up -d
```

By default, `NODE_ENV` is set to `production` in the `.env` file.

### View Logs

```bash
# All services
docker-compose logs -f

# Backend only
docker-compose logs -f backend

# Neo4j only
docker-compose logs -f graph-db
```

### Stop Services

```bash
docker-compose down
```

### Stop Services and Remove Volumes

```bash
docker-compose down -v
```

## Configuration

All configuration is stored in the `.env` file. See `.env-example` for available options.

### Key Configuration Options

- `BACKEND_PORT`: Port for the backend API (default: 3000)
- `NODE_ENV`: Node environment (development/production/test)
- `NEO4J_USER`: Neo4j username (default: neo4j)
- `NEO4J_PASSWORD`: Neo4j password (must be set)
- `NEO4J_HTTP_PORT`: Neo4j browser port (default: 7474)
- `NEO4J_BOLT_PORT`: Neo4j bolt port (default: 7687)

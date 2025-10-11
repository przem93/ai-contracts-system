# AI Contracts System

AI coding agent contracts system powered by Neo4j graph database and NestJS backend.

## Tech Stack

- **Backend**: NestJS (TypeScript)
- **Database**: Neo4j Graph Database
- **Infrastructure**: Docker & Docker Compose

## How It Works

The AI Contracts System manages and visualizes **technical dependency contracts** across your application ecosystem. It works by ingesting YAML contract files that describe the structure and relationships between modules, APIs, and components.

### Contract Definition Structure

Each YAML contract file represents a module (controller, service, component, etc.) and defines:

#### Core Properties

| Property | Description | Example |
|----------|-------------|---------|
| **id** | Unique identifier for the module | `users-get`, `auth-service` |
| **type** | Module type | `controller`, `service`, `component` |
| **category** | Functional domain | `api`, `service`, `frontend` |
| **description** | Purpose and functionality | `"Handles user authentication"` |
| **parts** | Exportable sub-components (optional) | Functions, classes, exports |
| **dependencies** | Modules this one depends on (optional) | References to other module IDs |

#### Understanding Dependencies

Dependencies in this system are **unidirectional**:
- If module A lists module B in its dependencies, it means **A → B** (A depends on B)
- Module B does NOT automatically depend on A
- Modules can specify exactly which **parts** they use from their dependencies

#### Part Type Matching

**Critical Feature**: When a module references a part from another module, the `type` field must match exactly. This ensures:
- Type safety across dependencies
- Automatic detection of breaking changes
- Clear identification of refactoring needs

### Example Contracts

#### Service Module (No Dependencies)

```yaml
id: users-permissions
type: service
description: Users permissions service
category: service
parts:
  - id: id
    type: string
  - id: name
    type: string
```

This defines a service that exports two parts: `id` and `name`.

#### API Controller (With Dependencies)

```yaml
id: users-get
type: controller
description: Users get endpoint
category: api
parts:
  - id: part
    type: string
dependencies:
  - module_id: users-permissions
    parts:
      - part_id: id
        type: string
      - part_id: name
        type: string
```

This defines a controller that depends on the `users-permissions` service and specifically uses its `id` and `name` parts.

### How Dependencies Are Tracked

1. **Granular Tracking**: Modules don't need to depend on an entire module — they specify exactly which parts they use
2. **Graph Representation**: Dependencies are stored in Neo4j as a directed graph
3. **Type Validation**: The system can detect when part types don't match between dependencies
4. **Impact Analysis**: Changes to one module can be traced through the dependency graph

### Contract File Location

Configure where the system looks for contract YAML files using the `.env` variable:

```bash
CONTRACTS_PATH=/contracts/**/*.yml
```

This allows you to:
- Store contracts in external repositories
- Organize contracts by domain or team
- Ingest contracts from CI/CD pipelines

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

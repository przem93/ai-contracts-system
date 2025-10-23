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

## Frontend Application

The frontend application provides a user-friendly **three-step workflow** for managing contract changes safely and effectively.

### Contract Management Workflow

#### Step 1: Review Contracts

The first step allows you to review all contracts and detect changes compared to what's currently stored in the Neo4j database.

**Key Features:**
- 📋 Displays all current contract files for review
- 🔍 Automatically compares contracts with the Neo4j database state
- ⚡ Shows a "Verify Contracts" button **only when changes are detected**
- 🔒 If no changes exist, the button is hidden and you cannot proceed to the next step
- 📊 Provides visual indication of which contracts have been modified, added, or removed

**User Flow:**
1. Navigate to the Review Contracts page
2. System automatically compares YAML files with database state
3. If changes detected → "Verify Contracts" button appears
4. If no changes → Button hidden, workflow ends here

#### Step 2: Verify Contracts

The second step validates the proposed contract changes before applying them to the database.

**Key Features:**
- ✅ Displays detailed verification results for all contract changes
- 🔍 Validates contract structure, dependencies, and type consistency
- 📝 Shows comprehensive validation messages (errors, warnings, success)
- 🚀 User can **apply changes only when verification is successful**
- 🔄 If verification fails, must go back to fix issues before proceeding

**Validation Checks:**
- Required fields present (`id`, `type`, `category`, `description`)
- Part definitions are well-formed
- Dependency references point to existing modules
- Part type consistency across dependencies
- No circular dependencies

**User Flow:**
1. Click "Verify Contracts" from Review step
2. System validates all proposed changes
3. Review validation results
4. If successful → "Apply Changes" button appears
5. If failed → Review errors and go back to fix

#### Step 3: Apply Changes

The final step applies verified changes to the Neo4j database and shows results.

**Success Scenario:**
- ✅ **Success page** displays when all changes are successfully applied
- 📊 Shows summary of changes applied (added, modified, removed)
- 🎉 Provides confirmation message
- 🔄 Allows user to return to review new contracts

**Error Scenario:**
- ❌ **Error page** displays if any errors occurred during application
- 📋 Shows detailed error messages explaining what went wrong
- 💡 Provides guidance on how to resolve issues
- 🔄 Allows user to retry or go back to review

**User Flow:**
1. Click "Apply Changes" from Verify step
2. System attempts to update Neo4j database
3. On success → See success page with change summary
4. On error → See error page with detailed diagnostics

### Workflow Benefits

This three-step approach ensures:
- **Safety**: No changes applied without validation
- **Transparency**: Clear visibility into what will change
- **Feedback**: Immediate validation results before database modifications
- **Control**: Users can review and verify before committing changes
- **Reliability**: Proper error handling with actionable guidance

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

### Frontend Application (React + Vite)

The frontend application provides a web interface for managing contracts through a three-step workflow.

**Default Port:** 8080 (configurable via `FRONTEND_PORT` in `.env`)

**Key Features:**
- 📋 Review contracts and detect changes
- ✅ Validate contract changes before applying
- 🚀 Apply verified changes to Neo4j database
- 🎨 Modern UI built with React, TypeScript, and Material-UI
- ⚡ Fast development with Vite

### Backend API (NestJS)

The backend API runs on port 3000 (configurable via `BACKEND_PORT` in `.env`).

**Available Endpoints:**

- `GET /` - Welcome message
- `GET /health` - Health check endpoint
- `GET /api/test` - Test endpoint (will be removed later)
- `GET /contracts` - Get all parsed contract files

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

### Running Tests with Docker

#### Backend Unit Tests in Watch Mode

A dedicated Docker service is available for running backend tests in watch mode during development:

```bash
# Start the backend test watch service
docker-compose --profile development up backend-test-watch

# View test output
docker-compose logs -f backend-test-watch
```

**Features:**
- ✅ Automatic test rerun on file changes
- ✅ Jest watch mode with `--watchAll` flag (runs all tests on every change)
- ✅ Source code and contracts mounted as volumes for instant updates
- ✅ Only runs when `NODE_ENV=development`
- ✅ Isolated from main application services

**Stop the test watch service:**
```bash
docker-compose stop backend-test-watch
```

#### Frontend Integration Tests with Playwright

The frontend integration tests use Playwright and follow the Page Object Model pattern for maintainability:

```bash
# Run frontend integration tests (requires services to be running)
docker-compose --profile development run --rm frontend-test

# View test reports (after running tests)
open frontend/playwright-report/index.html
```

**Features:**
- ✅ Playwright for reliable E2E testing
- ✅ Page Object Model pattern for reusable test components
- ✅ Mock API responses for predictable tests
- ✅ Comprehensive test coverage for contracts listing
- ✅ Screenshots and videos on test failures
- ✅ HTML and list reporters

**Test Structure:**
```
frontend/tests/
├── pages/               # Page object classes
├── components/          # Reusable component abstractions
├── fixtures/            # Test data and mocks
└── *.spec.ts           # Test specifications
```

For more details on frontend tests, see [frontend/tests/README.md](./frontend/tests/README.md).

For more details on development workflows, see [DEVELOPMENT.md](./DEVELOPMENT.md).

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

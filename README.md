# AI Contracts System

AI coding agent contracts system powered by Neo4j graph database.

## Prerequisites

- Docker (version 20.10 or higher)
- Docker Compose (version 2.0 or higher)

## Setup Instructions

### 1. Environment Configuration

Before running the application, you need to configure your environment variables:

1. Copy the example environment file:
   ```bash
   cp .env-example .env
   ```

2. Edit the `.env` file with your preferred configuration:
   ```bash
   nano .env  # or use your preferred editor
   ```

3. **Important**: Update the `NEO4J_PASSWORD` to a secure password before running in production.

### 2. Environment Variables

The following environment variables can be configured in your `.env` file:

| Variable | Description | Default |
|----------|-------------|---------|
| `NEO4J_USER` | Neo4j database username | `neo4j` |
| `NEO4J_PASSWORD` | Neo4j database password | (must be set) |
| `NEO4J_HTTP_PORT` | HTTP port for Neo4j Browser | `7474` |
| `NEO4J_BOLT_PORT` | Bolt port for database connections | `7687` |
| `NEO4J_PLUGINS` | List of plugins to install | `["apoc"]` |
| `NEO4J_HEAP_INITIAL_SIZE` | Initial heap size | `512M` |
| `NEO4J_HEAP_MAX_SIZE` | Maximum heap size | `2G` |
| `NEO4J_PAGECACHE_SIZE` | Page cache size | `512M` |
| `NEO4J_UNRESTRICTED_PROCEDURES` | Unrestricted procedures | `apoc.*` |

### 3. Running the Application

Start the Neo4j database using Docker Compose:

```bash
docker-compose up -d
```

This will:
- Download the Neo4j Docker image (if not already present)
- Create necessary volumes for data persistence
- Start the Neo4j container in detached mode

### 4. Accessing Neo4j

Once the container is running, you can access:

- **Neo4j Browser**: http://localhost:7474
  - Login with the credentials set in your `.env` file
  - Default username: `neo4j`
  - Password: The value you set for `NEO4J_PASSWORD`

- **Bolt Connection**: `bolt://localhost:7687`
  - Use this connection string for application integrations

### 5. Managing the Database

#### View logs
```bash
docker-compose logs -f neo4j
```

#### Stop the database
```bash
docker-compose down
```

#### Stop and remove all data (WARNING: This deletes all data)
```bash
docker-compose down -v
```

#### Restart the database
```bash
docker-compose restart neo4j
```

#### Check health status
```bash
docker-compose ps
```

## Project Structure

```
.
├── docker-compose.yml    # Docker Compose configuration
├── .env                  # Environment variables (not in git)
├── .env-example          # Example environment configuration
├── .gitignore           # Git ignore rules
└── README.md            # This file
```

## Data Persistence

Data is persisted in Docker volumes:
- `neo4j_data`: Database data files
- `neo4j_logs`: Log files
- `neo4j_import`: Import directory for bulk data loads
- `neo4j_plugins`: Plugin files

These volumes persist even when containers are stopped, ensuring your data is not lost.

## Troubleshooting

### Container won't start
- Check if ports 7474 and 7687 are already in use
- Verify your `.env` file exists and has valid values
- Check logs: `docker-compose logs neo4j`

### Can't connect to Neo4j Browser
- Ensure the container is running: `docker-compose ps`
- Wait for health check to pass (can take 30-60 seconds on first start)
- Check firewall settings

### Authentication fails
- Verify credentials in your `.env` file match what you're using to login
- On first run, the password is set from the `NEO4J_PASSWORD` variable

## Security Notes

- **Never commit the `.env` file** to version control (it's already in `.gitignore`)
- Use strong passwords for production environments
- Consider restricting port access in production
- Review the `NEO4J_UNRESTRICTED_PROCEDURES` setting for security implications

## License

See LICENSE file for details.

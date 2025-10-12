# Development Guide

## Running Tests in Watch Mode with Docker

This project includes a dedicated Docker service for running backend tests in watch mode during development.

### Starting the Test Watch Service

The `backend-test-watch` service only runs when the `development` profile is active. To start it:

```bash
# Start the test watch service along with other development services
docker-compose --profile development up backend-test-watch

# Or start all services including development services
docker-compose --profile development up
```

### Features

- **Automatic Rerun**: Tests automatically rerun when you modify source files
- **Watch Mode**: Uses Jest's watch mode for interactive testing
- **Volume Mounted**: Source code is mounted as a volume, so changes are immediately reflected
- **Development Only**: Only runs when `NODE_ENV=development`

### How It Works

The service:
1. Uses a lightweight `Dockerfile.test` optimized for testing
2. Mounts your local `src` directory and `contracts` directory as volumes
3. Runs `npm run test:watch -- --watchAll` (runs all tests on every change)
4. Automatically detects file changes and reruns all tests

### Stopping the Service

```bash
# Stop the test watch service
docker-compose stop backend-test-watch

# Or stop all services
docker-compose down
```

### Viewing Test Output

```bash
# View logs from the test watch service
docker-compose logs -f backend-test-watch
```

### Troubleshooting

**Tests not rerunning on file changes?**
- Ensure your source files are properly mounted as volumes
- Check that the container has access to the filesystem

**Container exits immediately?**
- Check the logs: `docker-compose logs backend-test-watch`
- Verify that all dependencies are installed correctly

**Need to rebuild?**
```bash
docker-compose build backend-test-watch
```

## Running Tests Locally (Without Docker)

If you prefer to run tests locally without Docker:

```bash
cd backend
npm install
npm run test:watch
```

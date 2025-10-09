# Hot Reload Testing Guide

This guide helps you verify that the automatic backend refresh functionality is working correctly.

## Prerequisites

1. Docker and Docker Compose installed
2. `.env` file configured (copy from `.env-example`)

## Test Steps

### Step 1: Start Development Environment

```bash
# From the project root
./docker-compose.dev.sh
```

Or manually:

```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

### Step 2: Verify Environment

1. Check that `NODE_ENV` is set to `development` in the backend logs
2. Wait for backend to start successfully
3. Verify the backend is running: http://localhost:3000/health

### Step 3: Test Hot Reload

1. **Make a code change** in `backend/src/app.service.ts`:

   ```typescript
   // Change the getHello() method to:
   getHello(): string {
     return 'Hello World - Hot Reload Test!';
   }
   ```

2. **Watch the logs** - You should see:
   - File change detected
   - NestJS recompiling
   - Application restarted automatically

3. **Verify the change** by visiting: http://localhost:3000
   - You should see the new message WITHOUT rebuilding the container

### Step 4: Verify Production Mode

1. **Stop the development environment**:
   ```bash
   docker-compose -f docker-compose.yml -f docker-compose.dev.yml down
   ```

2. **Start in production mode**:
   ```bash
   docker-compose up --build
   ```

3. **Make the same code change** as in Step 3

4. **Verify hot reload does NOT work**:
   - The change should NOT appear without rebuilding
   - This confirms hot reload only works in development mode

## Expected Behavior

### ✅ Development Mode (NODE_ENV=development)
- Code changes trigger automatic restart
- Changes appear immediately without rebuild
- Logs show "File change detected" messages
- Uses `Dockerfile.dev` and `npm run start:dev`

### ✅ Production Mode (NODE_ENV=production)
- Code changes do NOT trigger restart
- Container must be rebuilt for changes to appear
- Uses standard `Dockerfile` and compiled code
- More efficient and stable for production

## Troubleshooting

### Hot Reload Not Working?

1. **Check NODE_ENV**:
   ```bash
   docker-compose -f docker-compose.yml -f docker-compose.dev.yml exec backend printenv NODE_ENV
   ```
   Should return: `development`

2. **Check volumes are mounted**:
   ```bash
   docker-compose -f docker-compose.yml -f docker-compose.dev.yml exec backend ls -la /app/src
   ```
   Should show your source files

3. **Check if using correct Dockerfile**:
   ```bash
   docker-compose -f docker-compose.yml -f docker-compose.dev.yml exec backend cat /proc/1/cmdline
   ```
   Should show `npm` and `start:dev` command

### Changes Not Appearing?

- Ensure you're editing files in `backend/src/`
- Check file permissions on mounted volumes
- Restart the development environment
- Clear any caches: `docker-compose -f docker-compose.yml -f docker-compose.dev.yml down -v`

## Success Criteria

- [x] Backend starts successfully in development mode
- [x] `NODE_ENV` is set to `development`
- [x] Code changes trigger automatic restart
- [x] Changes appear without container rebuild
- [x] Production mode does NOT have hot reload
- [x] No errors in the logs during reload

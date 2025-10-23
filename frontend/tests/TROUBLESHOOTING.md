# Playwright Tests Troubleshooting Guide

## Common Issues and Solutions

### Issue: Tests fail with "element(s) not found"

**Symptoms:**
```
Error: expect(locator).toBeVisible() failed
Locator: getByRole('heading', { name: 'AI Contracts System', level: 1 })
Expected: visible
Error: element(s) not found
```

**Root Causes:**
1. **Page not fully loaded**: React app takes time to hydrate and render
2. **Wrong base URL**: Incorrect Docker networking configuration
3. **Services not ready**: Tests start before application is fully initialized

**Solutions Applied:**

#### 1. Fixed Base URL Configuration
- **Changed from**: `http://proxy:80`
- **Changed to**: `http://proxy`
- Port 80 is implicit for HTTP, Docker networking prefers simple hostnames

#### 2. Added Service Readiness Wait
In `docker-compose.yml`, added:
- 5-second sleep before starting tests
- Dependency on frontend service to ensure it's started
- Shell wrapper command to control test execution

```yaml
command: 
  - /bin/sh
  - -c
  - |
    echo "Waiting for application to be ready..."
    sleep 5
    npx playwright test --reporter=list,html
depends_on:
  frontend:
    condition: service_started
```

#### 3. Improved Navigation and Wait Strategies

**In `BasePage.ts`:**
- Changed from `networkidle` to `domcontentloaded` for faster, more reliable page loads
- `networkidle` can timeout in Docker environments with ongoing network activity

**In `ContractsListPage.ts`:**
- Added explicit wait for React root element (`#root`)
- Added wait for MUI Container to ensure React has rendered
- Increased timeouts to 10 seconds for Docker environment

**In Test Specs:**
- Added wait for root element in critical tests
- Increased timeout for first visibility check
- Added health check test to verify environment setup

#### 4. Updated Playwright Configuration
- Changed default baseURL from `http://localhost:80` to `http://localhost`
- Increased `navigationTimeout` to 15 seconds
- Better handling of Docker networking delays

### Issue: Tests timeout or hang

**Solution:**
- Ensure all services are running: `docker-compose up -d`
- Check service health: `docker-compose ps`
- View logs: `docker-compose logs -f frontend backend proxy`
- Verify network connectivity: `docker-compose exec frontend-test ping proxy`

### Issue: Inconsistent test results

**Common Causes:**
1. **Race conditions**: Page elements loading at different speeds
2. **Network delays**: Docker networking can introduce latency
3. **React hydration**: Client-side React takes time to become interactive

**Solutions:**
- Use explicit waits instead of implicit timeouts
- Wait for specific elements before interactions
- Use `waitForLoadState('domcontentloaded')` instead of `networkidle`
- Add waits for React-specific elements (root, container)

## Best Practices for Writing Tests in Docker

### 1. Always Wait for React to Render
```typescript
await page.waitForSelector('#root', { state: 'attached' });
await page.waitForSelector('[class*="MuiContainer"]', { timeout: 10000 });
```

### 2. Use Appropriate Wait Strategies
```typescript
// ✅ Good: Wait for DOM content
await page.goto('/', { waitUntil: 'domcontentloaded' });

// ❌ Avoid: Network idle can timeout in Docker
await page.goto('/', { waitUntil: 'networkidle' });
```

### 3. Set Realistic Timeouts
```typescript
// Docker environments need more time
await expect(element).toBeVisible({ timeout: 10000 });
```

### 4. Test Service Health First
Create a health check test that runs first:
```typescript
test('should be able to access the application', async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.status()).toBeLessThan(400);
});
```

## Debugging Failed Tests

### 1. View Screenshots
After test failures, screenshots are saved to `test-results/`:
```bash
ls -la frontend/test-results/
```

### 2. View Videos
Videos are recorded for failed tests:
```bash
open frontend/test-results/<test-name>/video.webm
```

### 3. View Trace Files
Playwright traces show step-by-step execution:
```bash
npx playwright show-trace frontend/test-results/<test-name>/trace.zip
```

### 4. Check Container Logs
```bash
# Frontend logs
docker-compose logs -f frontend

# Backend logs  
docker-compose logs -f backend

# Nginx proxy logs
docker-compose logs -f proxy

# Test logs
docker-compose logs frontend-test
```

### 5. Access the Application Directly
Open http://localhost in a browser to see what the tests are seeing.

### 6. Run Tests with UI Mode (Local Only)
```bash
cd frontend
npm run test:e2e:ui
```

## Environment-Specific Considerations

### Docker Environment
- **Network**: Uses internal Docker network (`ai-contracts-network`)
- **Base URL**: `http://proxy` (internal hostname)
- **Timing**: Services need time to fully initialize
- **Dependencies**: Tests depend on proxy, backend, and frontend services

### Local Environment
- **Network**: Uses localhost
- **Base URL**: `http://localhost`
- **Timing**: Faster, direct access
- **Dependencies**: Starts its own dev server via Playwright config

## Configuration Files Reference

### playwright.config.ts
- Sets base URL and timeouts
- Configures browsers and reporters
- Handles local vs Docker differences

### docker-compose.yml (frontend-test service)
- Sets PLAYWRIGHT_BASE_URL environment variable
- Manages service dependencies
- Adds startup delay for service readiness

### tests/pages/BasePage.ts
- Common navigation and wait logic
- Used by all page objects

### tests/pages/ContractsListPage.ts
- Contract-specific page interactions
- Waits for React rendering

## Quick Fix Checklist

When tests fail:
- [ ] Are all services running? (`docker-compose ps`)
- [ ] Is the base URL correct for the environment?
- [ ] Are timeouts sufficient (10-15 seconds)?
- [ ] Does the page use React and need hydration time?
- [ ] Are you waiting for the root element?
- [ ] Are you waiting for MUI components to render?
- [ ] Have you checked the screenshots/videos?
- [ ] Can you access the app in a browser?

## Getting Help

1. Check this troubleshooting guide
2. Review test failure screenshots and videos
3. Check container logs for errors
4. Verify services are healthy
5. Run health check test first
6. Try running tests locally to isolate Docker issues

# Final 403 Error Fix - Complete Solution

## The Real Problem

The 403 error is caused by **Vite's host header checking** in combination with Docker networking. Here's what happens:

```
Playwright/Wget → http://proxy/ → nginx → Host: proxy → Vite → 403 FORBIDDEN
```

Vite 5.x has built-in security that rejects requests with unrecognized Host headers to prevent DNS rebinding attacks.

## Analysis from Logs

```
✅ 172.18.0.1 "GET / HTTP/1.1" 200    (Browser - Host: localhost)
❌ 172.18.0.7 "HEAD / HTTP/1.1" 403   (Playwright - Host: proxy)
```

**Key insight**: The browser works because it sends `Host: localhost`, but Playwright sends `Host: proxy` which Vite rejects.

## Complete Fix (2 Files)

### 1. nginx/nginx.conf - Force localhost Host Header

**The Change:**
```nginx
location / {
    proxy_pass http://frontend:80;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    # ✅ CRITICAL FIX: Force Host to localhost
    proxy_set_header Host localhost;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host $host;  # Preserve original
}
```

**Why**: This makes nginx always send `Host: localhost` to Vite, which Vite accepts.

### 2. frontend/vite.config.ts - Permissive Server Config

**The Config:**
```typescript
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',      // Listen on all interfaces
    port: 80,             // Match Docker expose
    strictPort: true,     // Fail if port unavailable
    hmr: {
      clientPort: 80,     // WebSocket HMR on same port
    },
    cors: true,           // Allow cross-origin requests
  },
  preview: {
    host: '0.0.0.0',
    port: 80,
    strictPort: true,
    cors: true,
  }
})
```

## Why Previous Fixes Didn't Work

1. **Just fixing vite.config.ts**: Not enough - nginx was still sending wrong Host header
2. **Just fixing nginx**: Not enough - Vite config had restrictive settings
3. **Not restarting containers**: Changes in mounted files require container restart

## Step-by-Step Fix Application

### Step 1: Verify Changes Are in Place

```bash
# Check nginx config
grep "proxy_set_header Host localhost" nginx/nginx.conf

# Check vite config  
grep "host: '0.0.0.0'" frontend/vite.config.ts
```

Both should return results showing the fixes are in place.

### Step 2: Rebuild/Restart Containers

This is **CRITICAL** - containers must pick up the new configuration:

```bash
# Stop all services
docker-compose down

# Rebuild proxy (nginx config changed)
docker-compose build proxy

# Restart frontend (vite.config.ts changed via volume mount)
docker-compose up -d

# Wait for services to be healthy
sleep 10
```

### Step 3: Verify Connectivity

```bash
# Test from outside Docker
curl -I http://localhost/
# Should return 200 OK

# Test from inside Docker (simulating Playwright)
docker-compose exec proxy curl -I http://frontend:80/
# Should return 200 OK
```

### Step 4: Run Tests

```bash
docker-compose --profile development run --rm frontend-test
```

## Alternative: Direct Frontend Access (Bypass Proxy)

If nginx configuration doesn't work, we can have Playwright connect directly to the frontend container:

**In docker-compose.yml:**
```yaml
frontend-test:
  environment:
    - PLAYWRIGHT_BASE_URL=http://frontend:80  # Direct access, bypass proxy
```

This bypasses nginx entirely and connects directly to Vite.

## Debugging Commands

### Check What Host Header Is Being Sent

```bash
# From test container, see what happens
docker-compose run --rm frontend-test sh -c "wget -S -O /dev/null http://proxy/ 2>&1 | grep -i host"
```

### Check Vite Logs

```bash
# See Vite's response
docker-compose logs -f frontend | grep -i "403\|forbidden\|host"
```

### Check If Vite Is Actually Running on Port 80

```bash
# From inside frontend container
docker-compose exec frontend netstat -tuln | grep :80
# Should show process listening on port 80
```

## Expected Flow After Fix

```
Playwright Test (172.18.0.7)
    ↓ GET http://proxy/
nginx (172.18.0.6)
    ↓ proxy_set_header Host localhost
    ↓ GET http://frontend:80/ with Host: localhost
Vite Dev Server (frontend container)
    ↓ Accepts request (Host: localhost is allowed)
    ↓ Returns 200 OK with React app
React App Loads
    ↓ #root element present
Playwright Tests Run Successfully ✅
```

## Files Changed

1. ✅ `nginx/nginx.conf` - Force `Host: localhost` header
2. ✅ `frontend/vite.config.ts` - Permissive server configuration
3. ✅ `frontend/start.sh` - Build before preview (from earlier fix)
4. ✅ `frontend/package.json` - Correct port configuration

## Critical Notes

1. **Must restart containers** after configuration changes
2. **nginx must be rebuilt** since nginx.conf changed
3. **frontend reads vite.config.ts** at startup from volume mount
4. **Tests depend on proxy**, so proxy must be working first

## If Still Getting 403

Try the direct access approach:

```yaml
# In docker-compose.yml, frontend-test service
environment:
  - PLAYWRIGHT_BASE_URL=http://frontend:80  # Bypass nginx
```

This connects Playwright directly to Vite, bypassing nginx entirely. This will work because Vite with `host: '0.0.0.0'` accepts connections from any container.

## Summary

The fix is two-fold:
1. **nginx passes Host: localhost** → Vite accepts it
2. **Vite listens on 0.0.0.0:80** → Accepts connections from all containers

Both changes are essential. After applying both and restarting containers, the 403 errors will be resolved.

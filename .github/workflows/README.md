# GitHub Actions Workflows

This directory contains GitHub Actions workflows for continuous integration testing.

## Workflows

### Backend Tests (`backend-tests.yml`)

Runs Jest unit tests for the backend application.

**Triggers:**
- Pull requests to `main` or `develop` branches (when backend files change)
- Push to `main` or `develop` branches (when backend files change)

**What it does:**
1. Sets up Node.js 20
2. Installs dependencies with `npm ci`
3. Runs all unit tests with `npm test`
4. Generates code coverage report with `npm run test:cov`
5. Uploads coverage report as an artifact (retained for 30 days)

**Test Commands:**
- `npm test` - Runs all Jest unit tests
- `npm run test:cov` - Runs tests with coverage reporting

### Frontend Tests (`frontend-tests.yml`)

Runs Playwright E2E tests for the frontend application.

**Triggers:**
- Pull requests to `main` or `develop` branches (when frontend files change)
- Push to `main` or `develop` branches (when frontend files change)

**What it does:**
1. Sets up Node.js 20
2. Installs dependencies with `npm ci`
3. Installs Playwright browsers (Chromium only)
4. Builds the frontend application with `npm run build`
5. Starts a preview server using `npm run preview`
6. Waits for the server to be ready
7. Runs Playwright E2E tests with `npm run test:e2e`
8. Uploads test reports and videos as artifacts

**Test Commands:**
- `npm run test:e2e` - Runs all Playwright E2E tests

**Artifacts:**
- **playwright-report**: HTML test report (always uploaded, retained 30 days)
- **playwright-videos**: Test failure videos and traces (uploaded on failure, retained 7 days)

## Path Filtering

Both workflows use path filtering to only run when relevant files change:

- Backend tests run when files in `backend/**` change
- Frontend tests run when files in `frontend/**` change
- Both run when their respective workflow file changes

This optimization prevents unnecessary test runs and saves CI minutes.

## Using in Pull Requests

These workflows will automatically run on all pull requests to `main` or `develop` branches. You can:

1. **View workflow runs** in the GitHub Actions tab
2. **See status checks** on pull requests
3. **Download artifacts** (test reports, coverage, videos) from the workflow run page
4. **Require status checks** by configuring branch protection rules

## Local Testing

You can run these tests locally before pushing:

### Backend Tests
```bash
cd backend
npm test
npm run test:cov  # with coverage
```

### Frontend Tests
```bash
cd frontend
npm run build
npm run preview &  # start preview server
npm run test:e2e
```

## Troubleshooting

### Backend Tests Failing
- Ensure all dependencies are properly installed
- Check that test files follow Jest conventions (`.spec.ts`)
- Verify TypeScript compilation passes

### Frontend Tests Failing
- Ensure Playwright browsers are installed: `npx playwright install chromium`
- Check that the build succeeds: `npm run build`
- Verify preview server starts correctly on port 80
- Tests mock API responses, so backend is not required

## Requirements

- Node.js 20
- npm (package manager)
- GitHub Actions runner (Ubuntu latest)

## Future Enhancements

Potential improvements:
- Add linting checks (ESLint)
- Add type checking (TypeScript)
- Add build artifact caching
- Add test result comments on PRs
- Add Slack/Discord notifications for failures
- Matrix testing across multiple Node versions

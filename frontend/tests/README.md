# Frontend Integration Tests

This directory contains Playwright integration tests for the AI Contracts System frontend.

## 📁 Test Structure

The tests follow the **Page Object Model (POM)** pattern for better maintainability and reusability:

```
tests/
├── pages/               # Page object classes
│   ├── BasePage.ts     # Base page with common functionality
│   └── ContractsListPage.ts  # Contracts list page object
├── components/          # Reusable component abstractions
│   ├── Alert.ts        # Alert component wrapper
│   ├── ContractCard.ts # Contract card component wrapper
│   └── LoadingSpinner.ts  # Loading spinner component wrapper
├── contracts-list.spec.ts  # Integration tests for contracts listing
└── README.md           # This file
```

## 🏗️ Architecture

### Page Objects (`pages/`)

Page objects encapsulate the page structure and provide methods to interact with the page:

- **BasePage**: Base class with common functionality like navigation, waiting for page load, etc.
- **ContractsListPage**: Specific page object for the contracts list page with methods to interact with contracts

### Components (`components/`)

Component abstractions represent reusable UI elements:

- **Alert**: Wrapper for MUI Alert components
- **ContractCard**: Wrapper for contract card elements
- **LoadingSpinner**: Wrapper for loading spinner with wait methods

### Test Specs

Test specifications use the page objects and components to write readable, maintainable tests.

## 🚀 Running Tests

### Local Development

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install

# Run all tests
npm run test:e2e

# Run tests in UI mode (interactive)
npm run test:e2e:ui

# Run tests in headed mode (see the browser)
npm run test:e2e:headed

# Debug tests
npm run test:e2e:debug
```

### Using Docker

Run tests in Docker using docker-compose (recommended for CI/CD):

```bash
# Start the test service (requires services to be running)
docker-compose --profile development up frontend-test

# Run tests once and remove container
docker-compose --profile development run --rm frontend-test

# View test reports
# Reports are saved to ./playwright-report/
open playwright-report/index.html
```

## 📝 Test Coverage

Current test scenarios for contracts listing:

1. ✅ Page loads successfully with correct title and elements
2. ✅ Loading spinner displays while fetching contracts
3. ✅ Contracts display correctly when API returns data
4. ✅ "No contracts found" message when API returns empty array
5. ✅ Error message when API returns error response
6. ✅ Error message when network fails
7. ✅ All contract details display correctly (ID, type, category)
8. ✅ Multiple contracts with same type
9. ✅ Contracts with different categories

## 🧪 Writing New Tests

When writing new tests, follow these guidelines:

1. **Use Page Objects**: Create or extend page objects for new pages
2. **Create Component Abstractions**: Extract reusable components
3. **Write Descriptive Test Names**: Use clear, action-based descriptions
4. **Mock API Responses**: Use Playwright's route interception for predictable tests
5. **Follow AAA Pattern**: Arrange, Act, Assert

### Example Test

```typescript
test('should display contract details correctly', async ({ page }) => {
  // Arrange: Mock API response
  await page.route('**/api/contracts', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([...mockData]),
    });
  });

  // Act: Navigate and interact
  await contractsPage.navigate();
  await contractsPage.waitForContractsToLoad();

  // Assert: Verify results
  const contractsCount = await contractsPage.getContractsCount();
  expect(contractsCount).toBe(2);
});
```

## 🐛 Debugging

### View Test Reports

After running tests, open the HTML report:

```bash
npx playwright show-report
```

### Run Tests in Debug Mode

```bash
npm run test:e2e:debug
```

### Take Screenshots

Tests automatically take screenshots on failure. To manually take screenshots:

```typescript
await page.screenshot({ path: 'screenshots/my-test.png' });
```

### Common Issues

If tests are failing, check the [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) guide which covers:
- Element not found errors
- Timeout issues
- Docker-specific problems
- Service readiness
- Network configuration

### Docker-Specific Tips

When running tests in Docker:
1. Ensure all services are up: `docker-compose ps`
2. Check logs: `docker-compose logs -f frontend backend proxy`
3. Wait times may be longer due to network latency
4. Screenshots and videos are saved to `frontend/test-results/`

## 📊 CI/CD Integration

The tests are configured to run in CI environments:

- `CI=true` environment variable enables CI-specific behavior
- Tests run in headless mode
- Failed tests are retried 2 times
- HTML and list reporters are used
- Screenshots and videos are captured on failures

## 🔧 Configuration

Test configuration is in `playwright.config.ts`:

- **Test directory**: `./tests`
- **Timeout**: 30 seconds per test
- **Retries**: 2 retries in CI, 0 in local
- **Browsers**: Chromium (can be extended to Firefox, Safari)
- **Base URL**: Configured via `PLAYWRIGHT_BASE_URL` environment variable

## 📚 Resources

- [Playwright Documentation](https://playwright.dev)
- [Page Object Model Pattern](https://playwright.dev/docs/pom)
- [Best Practices](https://playwright.dev/docs/best-practices)

import { test, expect } from '@playwright/test';
import { SearchPage } from './pages/SearchPage';
import { ContractDetailPage } from './pages/ContractDetailPage';
import { mockSearchResults, mockSearchApiResponses } from './fixtures/contracts-data';

test.describe('Contract Detail Page', () => {
  let searchPage: SearchPage;
  let detailPage: ContractDetailPage;

  test.beforeEach(async ({ page }) => {
    // Mock the types API
    await page.route('**/api/contracts/types', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          types: ['controller', 'service', 'component'],
          count: 3
        })
      });
    });

    // Mock the categories API
    await page.route('**/api/contracts/categories', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          categories: ['api', 'service', 'frontend', 'component']
        })
      });
    });

    // Mock the search API endpoint
    await page.route('**/api/contracts/search*', async (route) => {
      await route.fulfill(mockSearchApiResponses.success(mockSearchResults.userSearch));
    });

    // Mock the get all contracts API endpoint
    await page.route('**/api/contracts', async (route) => {
      // Only handle GET requests to /api/contracts (not /api/contracts/*)
      if (route.request().url().match(/\/api\/contracts(?:$|\?)/)) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              fileName: 'users-get.yml',
              filePath: '/contracts/users-get.yml',
              fileHash: 'abc123',
              content: {
                id: 'users-get',
                type: 'controller',
                category: 'api',
                description: 'Users get endpoint',
                parts: [
                  { id: 'getUserById', type: 'function' },
                  { id: 'getAllUsers', type: 'function' }
                ]
              }
            },
            {
              fileName: 'users-permissions.yml',
              filePath: '/contracts/users-permissions.yml',
              fileHash: 'def456',
              content: {
                id: 'users-permissions',
                type: 'service',
                category: 'service',
                description: 'Users permissions service',
                parts: [
                  { id: 'id', type: 'string' },
                  { id: 'name', type: 'string' },
                  { id: 'checkPermission', type: 'function' }
                ]
              }
            }
          ])
        });
      } else {
        await route.continue();
      }
    });

    // Mock the module relations API endpoint
    await page.route('**/api/contracts/*/relations', async (route) => {
      const url = route.request().url();
      
      if (url.includes('users-get')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            module_id: 'users-get',
            outgoing_dependencies: [
              {
                module_id: 'users-permissions',
                parts: [
                  { part_id: 'id', type: 'string' },
                  { part_id: 'name', type: 'string' }
                ]
              }
            ],
            incoming_dependencies: []
          })
        });
      } else if (url.includes('users-permissions')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            module_id: 'users-permissions',
            outgoing_dependencies: [],
            incoming_dependencies: [
              {
                module_id: 'users-get',
                parts: [
                  { part_id: 'id', type: 'string' },
                  { part_id: 'name', type: 'string' }
                ]
              }
            ]
          })
        });
      } else {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Module not found' })
        });
      }
    });

    searchPage = new SearchPage(page);
    detailPage = new ContractDetailPage(page);
  });

  test('should navigate to contract detail page when clicking on a contract from search results', async ({ page }) => {
    // Navigate to search page
    await searchPage.navigate();
    await page.waitForTimeout(500);

    // Search for contracts
    await searchPage.search('user');
    await page.waitForTimeout(500);

    // Click on the first contract card
    const firstContract = searchPage.contractCards.first();
    await firstContract.click();

    // Wait for navigation
    await page.waitForTimeout(500);

    // Verify we're on the detail page
    await expect(page).toHaveURL(/\/contracts\/.+/);
    await expect(detailPage.pageTitle).toBeVisible();
  });

  test('should display contract basic information correctly', async ({ page }) => {
    // Navigate directly to detail page
    await detailPage.navigate('users-get');
    await page.waitForTimeout(500);

    // Verify title
    const title = await detailPage.getContractTitle();
    expect(title).toBe('users-get');

    // Verify category and type chips are visible
    await expect(detailPage.categoryChip).toBeVisible();
    await expect(detailPage.typeChip).toBeVisible();

    // Verify description is visible
    await expect(detailPage.description).toBeVisible();
  });

  test('should display contract parts section', async ({ page }) => {
    await detailPage.navigate('users-get');
    await page.waitForTimeout(500);

    // Verify parts section is visible
    await expect(detailPage.partsSection).toBeVisible();

    // Verify parts table has correct number of rows
    const partsCount = await detailPage.getPartsCount();
    expect(partsCount).toBe(2); // getUserById and getAllUsers
  });

  test('should display outgoing dependencies section', async ({ page }) => {
    await detailPage.navigate('users-get');
    await page.waitForTimeout(500);

    // Verify outgoing dependencies section is visible
    await expect(detailPage.outgoingDependenciesSection).toBeVisible();

    // Verify there is at least one outgoing dependency
    const outgoingCount = await detailPage.getOutgoingDependenciesCount();
    expect(outgoingCount).toBeGreaterThan(0);
  });

  test('should display incoming dependencies section', async ({ page }) => {
    await detailPage.navigate('users-permissions');
    await page.waitForTimeout(500);

    // Verify incoming dependencies section is visible
    await expect(detailPage.incomingDependenciesSection).toBeVisible();

    // Verify there is at least one incoming dependency
    const incomingCount = await detailPage.getIncomingDependenciesCount();
    expect(incomingCount).toBeGreaterThan(0);
  });

  test('should navigate back to search page when clicking back button', async ({ page }) => {
    // Navigate to search page first
    await searchPage.navigate();
    await page.waitForTimeout(500);

    // Search and click on a contract
    await searchPage.search('user');
    await page.waitForTimeout(500);
    
    const firstContract = searchPage.contractCards.first();
    await firstContract.click();
    await page.waitForTimeout(500);

    // Click back button
    await detailPage.clickBack();
    await page.waitForTimeout(500);

    // Verify we're back on the search page
    await expect(page).toHaveURL(/\/search/);
    await expect(searchPage.pageTitle).toBeVisible();
  });

  test('should show error when contract is not found', async ({ page }) => {
    await detailPage.navigate('nonexistent-contract');
    await page.waitForTimeout(500);

    // Verify error alert is displayed
    const hasError = await detailPage.hasError();
    expect(hasError).toBe(true);

    // Verify back button is still visible
    await expect(detailPage.backButton).toBeVisible();
  });

  test('should display loading state while fetching data', async ({ page }) => {
    // Mock the API with delay
    await page.route('**/api/contracts/users-get/relations', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          module_id: 'users-get',
          outgoing_dependencies: [],
          incoming_dependencies: []
        })
      });
    });

    await detailPage.navigate('users-get');

    // Verify loading spinner appears
    const loadingSpinner = page.locator('[role="progressbar"]');
    await expect(loadingSpinner).toBeVisible();

    // Wait for data to load
    await page.waitForTimeout(1200);

    // Verify loading spinner disappears
    await expect(loadingSpinner).not.toBeVisible();
  });

  test('should display empty state for modules with no parts', async ({ page }) => {
    // Mock contract with no parts
    await page.route('**/api/contracts', async (route) => {
      if (route.request().url().match(/\/api\/contracts(?:$|\?)/)) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              fileName: 'simple-module.yml',
              filePath: '/contracts/simple-module.yml',
              fileHash: 'xyz789',
              content: {
                id: 'simple-module',
                type: 'component',
                category: 'frontend',
                description: 'A simple module with no parts',
                parts: []
              }
            }
          ])
        });
      } else {
        await route.continue();
      }
    });

    await page.route('**/api/contracts/simple-module/relations', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          module_id: 'simple-module',
          outgoing_dependencies: [],
          incoming_dependencies: []
        })
      });
    });

    await detailPage.navigate('simple-module');
    await page.waitForTimeout(500);

    // Verify parts section is not visible (since there are no parts)
    const partsCount = await detailPage.getPartsCount();
    expect(partsCount).toBe(0);
  });

  test('should display empty state for modules with no dependencies', async ({ page }) => {
    await detailPage.navigate('users-permissions');
    await page.waitForTimeout(500);

    // Verify outgoing dependencies section shows "no dependencies" message
    const outgoingSection = page.locator('h5:has-text("Outgoing Dependencies")').locator('..');
    const noOutgoingMsg = outgoingSection.getByText(/This module has no outgoing dependencies/i);
    await expect(noOutgoingMsg).toBeVisible();
  });
});

import { test, expect } from '@playwright/test';
import { ContractsListPage } from './pages/ContractsListPage';
import { LoadingSpinner } from './components/LoadingSpinner';
import { Alert } from './components/Alert';
import { mockContracts, mockApiResponses, mockCheckModifiedApiResponses } from './fixtures/contracts-data';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

test.describe('Contracts List Page', () => {
  let contractsPage: ContractsListPage;

  test.beforeEach(async ({ page }) => {
    contractsPage = new ContractsListPage(page);
  });

  test('should load the page successfully', async ({ page }) => {
    await contractsPage.navigate();
    
    // Wait for React to render the root element
    await page.waitForSelector('#root', { state: 'attached' });
    
    // Wait for the main container to be visible
    await page.waitForSelector('[class*="MuiContainer"]', { timeout: 10000 });
    
    // Verify main page elements are visible
    await expect(contractsPage.pageTitle).toBeVisible({ timeout: 10000 });
    await expect(contractsPage.pageTitle).toHaveText('AI Contracts System');
    
    await expect(contractsPage.pageSubtitle).toBeVisible();
    await expect(contractsPage.pageSubtitle).toHaveText('AI Coder Agent Contract Systems');
    
    await expect(contractsPage.contractsCardTitle).toBeVisible();
    await expect(contractsPage.contractsCardTitle).toHaveText('📋 Modified/New Contracts');
  });

  test('should show loading spinner while fetching contracts', async ({ page }) => {
    try {
      await page.route('**/api/contracts', async (route) => {
        await delay(10000);
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      });

      await page.route('**/api/contracts/check-if-contract-modified', async (route) => {
        await route.fulfill(mockCheckModifiedApiResponses.noChanges);
      });

      await contractsPage.navigate();

      const spinner = new LoadingSpinner(contractsPage.loadingSpinner);
      await spinner.verifyIsVisible();
    } finally {
      await page.unrouteAll({ behavior: 'ignoreErrors' });
    }
  });

  test('should display only modified/new contracts when API returns data with changes', async ({ page }) => {
    // Mock API responses - both contracts endpoint and check-modified endpoint
    await page.route('**/api/contracts', async (route) => {
      await route.fulfill(mockApiResponses.success(mockContracts.validContracts));
    });

    await page.route('**/api/contracts/check-if-contract-modified', async (route) => {
      await route.fulfill(mockCheckModifiedApiResponses.hasChanges);
    });

    await contractsPage.navigate();
    await contractsPage.waitForContractsToLoad();

    // Verify only 2 modified/new contracts are displayed (as defined in mockCheckModified.hasChanges)
    const contractsCount = await contractsPage.getContractsCount();
    expect(contractsCount).toBe(2);

    // Verify first contract details (modified)
    const firstContract = await contractsPage.getContractDetails(0);
    expect(firstContract.fileName).toBe('example-contract.yml');
    expect(firstContract.filePath).toBe('/contracts/example-contract.yml');
    expect(firstContract.id).toBe('users-get');
    expect(firstContract.type).toBe('controller');
    expect(firstContract.category).toBe('api');

    // Verify second contract details (added)
    const secondContract = await contractsPage.getContractDetails(1);
    expect(secondContract.fileName).toBe('example-dependency.yml');
    expect(secondContract.filePath).toBe('/contracts/example-dependency.yml');
    expect(secondContract.id).toBe('users-permissions');
    expect(secondContract.type).toBe('service');
    expect(secondContract.category).toBe('service');
  });

  test('should display "No modified or new contracts" message when there are no changes', async ({ page }) => {
    // Mock API response with contracts but no changes
    await page.route('**/api/contracts', async (route) => {
      await route.fulfill(mockApiResponses.success(mockContracts.validContracts));
    });

    await page.route('**/api/contracts/check-if-contract-modified', async (route) => {
      await route.fulfill(mockCheckModifiedApiResponses.noChanges);
    });

    await contractsPage.navigate();
    await contractsPage.waitForContractsToLoad();

    // Verify "no modified or new contracts" alert is displayed
    const noContractsAlert = new Alert(contractsPage.noContractsAlert);
    await noContractsAlert.verifyIsVisible();
    await noContractsAlert.verifyText('No modified or new contracts found');
  });

  test('should display error message when contracts API fails', async ({ page }) => {
    // Mock API to return error
    await page.route('**/api/contracts', async (route) => {
      await route.fulfill(mockApiResponses.serverError);
    });

    await page.route('**/api/contracts/check-if-contract-modified', async (route) => {
      await route.fulfill(mockCheckModifiedApiResponses.hasChanges);
    });

    await contractsPage.navigate();
    await contractsPage.waitForContractsToLoad();

    // Verify error alert is displayed
    const errorAlert = new Alert(contractsPage.errorAlert);
    await errorAlert.verifyIsVisible();
    await errorAlert.verifyText('Error loading contracts');
  });

  test('should display error message when check-modified API fails', async ({ page }) => {
    // Mock contracts API to succeed but check-modified to fail
    await page.route('**/api/contracts', async (route) => {
      await route.fulfill(mockApiResponses.success(mockContracts.validContracts));
    });

    await page.route('**/api/contracts/check-if-contract-modified', async (route) => {
      await route.fulfill(mockCheckModifiedApiResponses.serverError);
    });

    await contractsPage.navigate();
    await contractsPage.waitForContractsToLoad();

    // Verify error alert is displayed
    const errorAlert = new Alert(contractsPage.errorAlert);
    await errorAlert.verifyIsVisible();
    await errorAlert.verifyText('Error checking contract modifications');
  });

  test('should display error message when network fails', async ({ page }) => {
    // Mock network failure
    await page.route('**/api/contracts', async (route) => {
      await route.abort('failed');
    });

    await page.route('**/api/contracts/check-if-contract-modified', async (route) => {
      await route.fulfill(mockCheckModifiedApiResponses.hasChanges);
    });

    await contractsPage.navigate();
    await contractsPage.waitForContractsToLoad();

    // Verify error alert is displayed
    const errorAlert = new Alert(contractsPage.errorAlert);
    await errorAlert.verifyIsVisible();
    await errorAlert.verifyText('Error loading contracts');
  });

  test('should display modified contract details correctly with status badge', async ({ page }) => {
    // Create a mock response with single modified contract
    const singleModifiedContract = {
      hasChanges: true,
      totalChanges: 1,
      modifiedCount: 1,
      addedCount: 0,
      removedCount: 0,
      changes: [
        {
          moduleId: 'payment-service',
          fileName: 'single-contract.yml',
          filePath: '/contracts/single-contract.yml',
          currentHash: 'a3d2f1e8b9c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1',
          storedHash: 'b4e3d2c1b0a9f8e7d6c5b4a3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3',
          status: 'modified',
        },
      ],
    };

    await page.route('**/api/contracts', async (route) => {
      await route.fulfill(mockApiResponses.success([mockContracts.singleContract]));
    });

    await page.route('**/api/contracts/check-if-contract-modified', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(singleModifiedContract),
      });
    });

    await contractsPage.navigate();
    await contractsPage.waitForContractsToLoad();

    // Verify contract is displayed
    const exists = await contractsPage.verifyContractExists({
      fileName: 'single-contract.yml',
      id: 'payment-service',
      type: 'service',
      category: 'backend',
    });

    expect(exists).toBe(true);
  });

  test('should handle multiple modified contracts with same type', async ({ page }) => {
    // Create mock data for all 3 service contracts being modified
    const multipleModifiedContracts = {
      hasChanges: true,
      totalChanges: 3,
      modifiedCount: 3,
      addedCount: 0,
      removedCount: 0,
      changes: [
        {
          moduleId: 'service-a',
          fileName: 'service-a.yml',
          filePath: '/contracts/service-a.yml',
          currentHash: 'hash-a',
          storedHash: 'old-hash-a',
          status: 'modified' as const,
        },
        {
          moduleId: 'service-b',
          fileName: 'service-b.yml',
          filePath: '/contracts/service-b.yml',
          currentHash: 'hash-b',
          storedHash: 'old-hash-b',
          status: 'modified' as const,
        },
        {
          moduleId: 'service-c',
          fileName: 'service-c.yml',
          filePath: '/contracts/service-c.yml',
          currentHash: 'hash-c',
          storedHash: 'old-hash-c',
          status: 'modified' as const,
        },
      ],
    };

    await page.route('**/api/contracts', async (route) => {
      await route.fulfill(mockApiResponses.success(mockContracts.serviceContracts));
    });

    await page.route('**/api/contracts/check-if-contract-modified', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(multipleModifiedContracts),
      });
    });

    await contractsPage.navigate();
    await contractsPage.waitForContractsToLoad();

    // Verify all 3 modified contracts are displayed
    const contractsCount = await contractsPage.getContractsCount();
    expect(contractsCount).toBe(3);

    // Verify all file names are present
    const fileNames = await contractsPage.getAllContractFileNames();
    expect(fileNames).toContain('service-a.yml');
    expect(fileNames).toContain('service-b.yml');
    expect(fileNames).toContain('service-c.yml');
  });

  test('should handle modified contracts with different categories', async ({ page }) => {
    // Create mock data for mixed category contracts being modified
    const mixedModifiedContracts = {
      hasChanges: true,
      totalChanges: 3,
      modifiedCount: 2,
      addedCount: 1,
      removedCount: 0,
      changes: [
        {
          moduleId: 'users-controller',
          fileName: 'api-controller.yml',
          filePath: '/contracts/api-controller.yml',
          currentHash: 'hash-api',
          storedHash: 'old-hash-api',
          status: 'modified' as const,
        },
        {
          moduleId: 'users-service',
          fileName: 'business-service.yml',
          filePath: '/contracts/business-service.yml',
          currentHash: 'hash-service',
          storedHash: 'old-hash-service',
          status: 'modified' as const,
        },
        {
          moduleId: 'users-table',
          fileName: 'ui-component.yml',
          filePath: '/contracts/ui-component.yml',
          currentHash: 'hash-frontend',
          storedHash: null,
          status: 'added' as const,
        },
      ],
    };

    await page.route('**/api/contracts', async (route) => {
      await route.fulfill(mockApiResponses.success(mockContracts.mixedCategoryContracts));
    });

    await page.route('**/api/contracts/check-if-contract-modified', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mixedModifiedContracts),
      });
    });

    await contractsPage.navigate();
    await contractsPage.waitForContractsToLoad();

    // Verify all categories are represented
    const apiContract = await contractsPage.verifyContractExists({ category: 'api' });
    const serviceContract = await contractsPage.verifyContractExists({ category: 'service' });
    const frontendContract = await contractsPage.verifyContractExists({ category: 'frontend' });

    expect(apiContract).toBe(true);
    expect(serviceContract).toBe(true);
    expect(frontendContract).toBe(true);
  });

});

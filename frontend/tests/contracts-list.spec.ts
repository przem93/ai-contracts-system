import { test, expect } from '@playwright/test';
import { ContractsListPage } from './pages/ContractsListPage';
import { LoadingSpinner } from './components/LoadingSpinner';
import { Alert } from './components/Alert';
import { mockContracts, mockApiResponses } from './fixtures/contracts-data';

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
    await expect(contractsPage.contractsCardTitle).toHaveText('📋 Contracts List');
  });

  test('should show loading spinner while fetching contracts', async ({ page }) => {
    // Intercept the API call to delay the response
    await page.route('**/api/contracts', async (route) => {
      await page.waitForTimeout(1000); // Delay for 1 second
      await route.continue();
    });

    await contractsPage.navigate();
    
    // Verify loading spinner is visible initially
    const spinner = new LoadingSpinner(contractsPage.loadingSpinner);
    await spinner.verifyIsVisible();
  });

  test('should display contracts when API returns data', async ({ page }) => {
    // Mock API response with sample contracts
    await page.route('**/api/contracts', async (route) => {
      await route.fulfill(mockApiResponses.success(mockContracts.validContracts));
    });

    await contractsPage.navigate();
    await contractsPage.waitForContractsToLoad();

    // Verify contracts are displayed
    const contractsCount = await contractsPage.getContractsCount();
    expect(contractsCount).toBe(2);

    // Verify first contract details
    const firstContract = await contractsPage.getContractDetails(0);
    expect(firstContract.fileName).toBe('example-contract.yml');
    expect(firstContract.filePath).toBe('/contracts/example-contract.yml');
    expect(firstContract.id).toBe('users-get');
    expect(firstContract.type).toBe('controller');
    expect(firstContract.category).toBe('api');

    // Verify second contract details
    const secondContract = await contractsPage.getContractDetails(1);
    expect(secondContract.fileName).toBe('example-dependency.yml');
    expect(secondContract.filePath).toBe('/contracts/example-dependency.yml');
    expect(secondContract.id).toBe('users-permissions');
    expect(secondContract.type).toBe('service');
    expect(secondContract.category).toBe('service');
  });

  test('should display "No contracts found" message when API returns empty array', async ({ page }) => {
    // Mock API response with empty array
    await page.route('**/api/contracts', async (route) => {
      await route.fulfill(mockApiResponses.empty);
    });

    await contractsPage.navigate();
    await contractsPage.waitForContractsToLoad();

    // Verify "no contracts" alert is displayed
    const noContractsAlert = new Alert(contractsPage.noContractsAlert);
    await noContractsAlert.verifyIsVisible();
    await noContractsAlert.verifyText('No contracts found');
  });

  test('should display error message when API fails', async ({ page }) => {
    // Mock API to return error
    await page.route('**/api/contracts', async (route) => {
      await route.fulfill(mockApiResponses.serverError);
    });

    await contractsPage.navigate();
    await contractsPage.waitForContractsToLoad();

    // Verify error alert is displayed
    const errorAlert = new Alert(contractsPage.errorAlert);
    await errorAlert.verifyIsVisible();
    await errorAlert.verifyText('Error loading contracts');
  });

  test('should display error message when network fails', async ({ page }) => {
    // Mock network failure
    await page.route('**/api/contracts', async (route) => {
      await route.abort('failed');
    });

    await contractsPage.navigate();
    await contractsPage.waitForContractsToLoad();

    // Verify error alert is displayed
    const errorAlert = new Alert(contractsPage.errorAlert);
    await errorAlert.verifyIsVisible();
    await errorAlert.verifyText('Error loading contracts');
  });

  test('should display all contract details correctly', async ({ page }) => {
    // Mock API response with detailed contract
    await page.route('**/api/contracts', async (route) => {
      await route.fulfill(mockApiResponses.success([mockContracts.singleContract]));
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

  test('should handle multiple contracts with same type', async ({ page }) => {
    // Mock API response with multiple contracts of same type
    await page.route('**/api/contracts', async (route) => {
      await route.fulfill(mockApiResponses.success(mockContracts.serviceContracts));
    });

    await contractsPage.navigate();
    await contractsPage.waitForContractsToLoad();

    // Verify all contracts are displayed
    const contractsCount = await contractsPage.getContractsCount();
    expect(contractsCount).toBe(3);

    // Verify all file names are present
    const fileNames = await contractsPage.getAllContractFileNames();
    expect(fileNames).toContain('service-a.yml');
    expect(fileNames).toContain('service-b.yml');
    expect(fileNames).toContain('service-c.yml');
  });

  test('should handle contracts with different categories', async ({ page }) => {
    // Mock API response with contracts from different categories
    await page.route('**/api/contracts', async (route) => {
      await route.fulfill(mockApiResponses.success(mockContracts.mixedCategoryContracts));
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

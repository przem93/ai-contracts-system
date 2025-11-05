import { test, expect } from '@playwright/test';
import { ContractsListPage } from './pages/ContractsListPage';
import { Alert } from './components/Alert';
import { mockContracts, mockApiResponses, mockCheckModifiedApiResponses } from './fixtures/contracts-data';

test.describe('Contract Verify Button - Check Modified State', () => {
  let contractsPage: ContractsListPage;

  test.beforeEach(async ({ page }) => {
    contractsPage = new ContractsListPage(page);
  });

  test('should enable verify button when contracts have changes', async ({ page }) => {
    // Arrange: Mock API responses - contracts exist and have changes
    await page.route('**/api/contracts', async (route) => {
      await route.fulfill(mockApiResponses.success(mockContracts.validContracts));
    });

    await page.route('**/api/contracts/check-if-contract-modified', async (route) => {
      await route.fulfill(mockCheckModifiedApiResponses.hasChanges);
    });

    // Act: Navigate to page
    await contractsPage.navigate();
    await contractsPage.waitForContractsToLoad();

    // Assert: Verify button should be enabled
    await expect(contractsPage.verifyContractsButton).toBeVisible();
    await expect(contractsPage.verifyContractsButton).toBeEnabled();
    await expect(contractsPage.verifyContractsButton).toHaveText('Verify Contracts');
    
    // Assert: No "no changes" alert should be visible
    await expect(contractsPage.noChangesAlert).not.toBeVisible();
  });

  test('should disable verify button when contracts have no changes', async ({ page }) => {
    // Arrange: Mock API responses - contracts exist but have no changes
    await page.route('**/api/contracts', async (route) => {
      await route.fulfill(mockApiResponses.success(mockContracts.validContracts));
    });

    await page.route('**/api/contracts/check-if-contract-modified', async (route) => {
      await route.fulfill(mockCheckModifiedApiResponses.noChanges);
    });

    // Act: Navigate to page
    await contractsPage.navigate();
    await contractsPage.waitForContractsToLoad();

    // Assert: Verify button should be disabled
    await expect(contractsPage.verifyContractsButton).toBeVisible();
    await expect(contractsPage.verifyContractsButton).toBeDisabled();
    await expect(contractsPage.verifyContractsButton).toHaveText('Verify Contracts');
    
    // Assert: "No changes" alert should be visible
    const noChangesAlert = new Alert(contractsPage.noChangesAlert);
    await noChangesAlert.verifyIsVisible();
    await noChangesAlert.verifyText('No changes detected. All contracts are up to date with the database.');
  });

  test('should show "Checking for changes..." text while checking modifications', async ({ page }) => {
    // Arrange: Mock API responses with delay for check-if-contract-modified
    await page.route('**/api/contracts', async (route) => {
      await route.fulfill(mockApiResponses.success(mockContracts.validContracts));
    });

    const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
    await page.route('**/api/contracts/check-if-contract-modified', async (route) => {
      await delay(2000); // 2 second delay
      await route.fulfill(mockCheckModifiedApiResponses.hasChanges);
    });

    // Act: Navigate to page
    await contractsPage.navigate();
    await contractsPage.waitForContractsToLoad();

    // Assert: Button should show "Checking for changes..." text while loading
    await expect(contractsPage.verifyContractsButton).toHaveText('Checking for changes...');
    await expect(contractsPage.verifyContractsButton).toBeDisabled();
    
    // Wait for check to complete
    await expect(contractsPage.verifyContractsButton).toHaveText('Verify Contracts', { timeout: 5000 });
    await expect(contractsPage.verifyContractsButton).toBeEnabled();
  });

  test('should display error when check-if-contract-modified API fails', async ({ page }) => {
    // Arrange: Mock API responses - contracts endpoint succeeds, check-modified fails
    await page.route('**/api/contracts', async (route) => {
      await route.fulfill(mockApiResponses.success(mockContracts.validContracts));
    });

    await page.route('**/api/contracts/check-if-contract-modified', async (route) => {
      await route.fulfill(mockCheckModifiedApiResponses.serverError);
    });

    // Act: Navigate to page
    await contractsPage.navigate();
    await contractsPage.waitForContractsToLoad();

    // Assert: Error alert should be visible
    const errorAlert = new Alert(contractsPage.checkModifiedErrorAlert);
    await errorAlert.verifyIsVisible();
    await errorAlert.verifyText('Error checking contract modifications');
    
    // Assert: Button should be disabled when there's an error
    await expect(contractsPage.verifyContractsButton).toBeDisabled();
  });

  test('should disable button when check-if-contract-modified network fails', async ({ page }) => {
    // Arrange: Mock API responses - contracts endpoint succeeds, check-modified network fails
    await page.route('**/api/contracts', async (route) => {
      await route.fulfill(mockApiResponses.success(mockContracts.validContracts));
    });

    await page.route('**/api/contracts/check-if-contract-modified', async (route) => {
      await route.abort('failed');
    });

    // Act: Navigate to page
    await contractsPage.navigate();
    await contractsPage.waitForContractsToLoad();

    // Assert: Error alert should be visible
    const errorAlert = new Alert(contractsPage.checkModifiedErrorAlert);
    await errorAlert.verifyIsVisible();
    
    // Assert: Button should be disabled
    await expect(contractsPage.verifyContractsButton).toBeDisabled();
  });

  test('should keep button disabled when there are no contracts and no changes', async ({ page }) => {
    // Arrange: Mock API responses - no contracts, no changes
    await page.route('**/api/contracts', async (route) => {
      await route.fulfill(mockApiResponses.empty);
    });

    await page.route('**/api/contracts/check-if-contract-modified', async (route) => {
      await route.fulfill(mockCheckModifiedApiResponses.noChanges);
    });

    // Act: Navigate to page
    await contractsPage.navigate();
    await contractsPage.waitForContractsToLoad();

    // Assert: "No contracts found" alert should be visible
    const noContractsAlert = new Alert(contractsPage.noContractsAlert);
    await noContractsAlert.verifyIsVisible();
    
    // Assert: "No changes" alert should be visible
    const noChangesAlert = new Alert(contractsPage.noChangesAlert);
    await noChangesAlert.verifyIsVisible();
    
    // Assert: Button should be disabled
    await expect(contractsPage.verifyContractsButton).toBeDisabled();
  });

  test('should enable button when there are no contracts but changes detected (new contracts added)', async ({ page }) => {
    // Arrange: Mock API responses - no existing contracts in DB, but new contracts detected
    await page.route('**/api/contracts', async (route) => {
      await route.fulfill(mockApiResponses.success(mockContracts.validContracts));
    });

    await page.route('**/api/contracts/check-if-contract-modified', async (route) => {
      await route.fulfill(mockCheckModifiedApiResponses.hasChanges);
    });

    // Act: Navigate to page
    await contractsPage.navigate();
    await contractsPage.waitForContractsToLoad();

    // Assert: Contracts should be displayed
    const contractsCount = await contractsPage.getContractsCount();
    expect(contractsCount).toBe(2);
    
    // Assert: Button should be enabled (new contracts detected)
    await expect(contractsPage.verifyContractsButton).toBeEnabled();
  });

  test('should not allow navigation when button is disabled', async ({ page }) => {
    // Arrange: Mock API responses - no changes detected
    await page.route('**/api/contracts', async (route) => {
      await route.fulfill(mockApiResponses.success(mockContracts.validContracts));
    });

    await page.route('**/api/contracts/check-if-contract-modified', async (route) => {
      await route.fulfill(mockCheckModifiedApiResponses.noChanges);
    });

    // Act: Navigate to page
    await contractsPage.navigate();
    await contractsPage.waitForContractsToLoad();

    // Assert: Button should be disabled
    await expect(contractsPage.verifyContractsButton).toBeDisabled();
    
    // Act: Try to click the button (should not navigate)
    await contractsPage.verifyContractsButton.click({ force: true });
    
    // Assert: Should still be on the same page (not navigated)
    await expect(page).toHaveURL('/');
    await expect(contractsPage.pageTitle).toBeVisible();
  });

  test('should allow navigation when button is enabled', async ({ page }) => {
    // Arrange: Mock API responses - changes detected
    await page.route('**/api/contracts', async (route) => {
      await route.fulfill(mockApiResponses.success(mockContracts.validContracts));
    });

    await page.route('**/api/contracts/check-if-contract-modified', async (route) => {
      await route.fulfill(mockCheckModifiedApiResponses.hasChanges);
    });

    // Act: Navigate to page
    await contractsPage.navigate();
    await contractsPage.waitForContractsToLoad();

    // Assert: Button should be enabled
    await expect(contractsPage.verifyContractsButton).toBeEnabled();
    
    // Act: Click the button
    await contractsPage.verifyContractsButton.click();
    
    // Assert: Should navigate to validation page
    await expect(page).toHaveURL('/validation');
  });
});

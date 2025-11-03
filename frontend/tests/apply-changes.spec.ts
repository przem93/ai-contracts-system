import { test, expect } from '@playwright/test';
import { ApplyChangesPage } from './pages/ApplyChangesPage';
import { ValidationPage } from './pages/ValidationPage';
import { LoadingSpinner } from './components/LoadingSpinner';
import { Alert } from './components/Alert';
import { mockApplyApiResponses } from './fixtures/apply-data';
import { mockValidationApiResponses } from './fixtures/validation-data';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

test.describe('Apply Changes Page', () => {
  let applyChangesPage: ApplyChangesPage;

  test.beforeEach(async ({ page }) => {
    applyChangesPage = new ApplyChangesPage(page);
  });

  test('should navigate from validation page when contracts are valid', async ({ page }) => {
    const validationPage = new ValidationPage(page);

    // Mock validation API response with all valid contracts
    await page.route('**/api/contracts/validate', async (route) => {
      await route.fulfill(mockValidationApiResponses.successAllValid);
    });

    // Navigate to validation page
    await validationPage.navigate();
    await validationPage.waitForValidationToLoad();

    // Verify the Apply Changes button is visible
    const applyButton = page.getByRole('button', { name: 'Apply Changes' });
    await expect(applyButton).toBeVisible();

    // Mock apply API response
    await page.route('**/api/contracts/apply', async (route) => {
      await route.fulfill(mockApplyApiResponses.success);
    });

    // Click the Apply Changes button
    await applyButton.click();

    // Verify navigation to apply page
    await expect(page).toHaveURL('/apply');
    await expect(applyChangesPage.pageTitle).toBeVisible();
  });

  test('should NOT show Apply Changes button when contracts are invalid', async ({ page }) => {
    const validationPage = new ValidationPage(page);

    // Mock validation API response with some invalid contracts
    await page.route('**/api/contracts/validate', async (route) => {
      await route.fulfill(mockValidationApiResponses.successSomeInvalid);
    });

    // Navigate to validation page
    await validationPage.navigate();
    await validationPage.waitForValidationToLoad();

    // Verify the Apply Changes button is NOT visible
    const applyButton = page.getByRole('button', { name: 'Apply Changes' });
    await expect(applyButton).not.toBeVisible();
  });

  test('should NOT show Apply Changes button when no files exist', async ({ page }) => {
    const validationPage = new ValidationPage(page);

    // Mock validation API response with no files
    await page.route('**/api/contracts/validate', async (route) => {
      await route.fulfill(mockValidationApiResponses.successNoFiles);
    });

    // Navigate to validation page
    await validationPage.navigate();
    await validationPage.waitForValidationToLoad();

    // Verify the Apply Changes button is NOT visible
    const applyButton = page.getByRole('button', { name: 'Apply Changes' });
    await expect(applyButton).not.toBeVisible();
  });

  test('should show loading spinner while applying changes', async ({ page }) => {
    try {
      // Mock apply API with delay
      await page.route('**/api/contracts/apply', async (route) => {
        await delay(10000);
        await route.fulfill(mockApplyApiResponses.success);
      });

      await applyChangesPage.navigate();

      // Verify loading spinner is visible
      const spinner = new LoadingSpinner(applyChangesPage.loadingSpinner);
      await spinner.verifyIsVisible();

      // Verify loading message
      await expect(page.getByText('Applying changes to database...')).toBeVisible();
    } finally {
      await page.unrouteAll({ behavior: 'ignoreErrors' });
    }
  });

  test('should display success message when changes are applied successfully', async ({ page }) => {
    // Mock apply API response
    await page.route('**/api/contracts/apply', async (route) => {
      await route.fulfill(mockApplyApiResponses.success);
    });

    await applyChangesPage.navigate();
    await applyChangesPage.waitForApplyToComplete();

    // Verify success state
    const isSuccessful = await applyChangesPage.isApplySuccessful();
    expect(isSuccessful).toBe(true);

    // Verify success icon is visible
    await expect(applyChangesPage.successIcon).toBeVisible();

    // Verify success message
    await expect(applyChangesPage.successMessage).toBeVisible();

    // Verify detailed message
    const successText = await page.textContent('text=Successfully applied');
    expect(successText).toContain('Successfully applied 5 modules and 12 parts to Neo4j');
  });

  test('should display correct statistics on success', async ({ page }) => {
    // Mock apply API response
    await page.route('**/api/contracts/apply', async (route) => {
      await route.fulfill(mockApplyApiResponses.success);
    });

    await applyChangesPage.navigate();
    await applyChangesPage.waitForApplyToComplete();

    // Verify statistics
    const results = await applyChangesPage.getApplyResults();
    expect(results.modulesProcessed).toBe(5);
    expect(results.partsProcessed).toBe(12);
  });

  test('should show Return to Contracts List button on success', async ({ page }) => {
    // Mock apply API response
    await page.route('**/api/contracts/apply', async (route) => {
      await route.fulfill(mockApplyApiResponses.success);
    });

    await applyChangesPage.navigate();
    await applyChangesPage.waitForApplyToComplete();

    // Verify button is visible
    await expect(applyChangesPage.returnToContractsButton).toBeVisible();

    // Click button and verify navigation
    await applyChangesPage.returnToContractsButton.click();
    await expect(page).toHaveURL('/');
  });

  test('should display error message when apply fails', async ({ page }) => {
    // Mock apply API to return error
    await page.route('**/api/contracts/apply', async (route) => {
      await route.fulfill(mockApplyApiResponses.databaseError);
    });

    await applyChangesPage.navigate();
    await applyChangesPage.waitForApplyToComplete();

    // Verify error state
    const hasFailed = await applyChangesPage.isApplyFailed();
    expect(hasFailed).toBe(true);

    // Verify error icon is visible
    await expect(applyChangesPage.errorIcon).toBeVisible();

    // Verify error message
    await expect(applyChangesPage.errorMessage).toBeVisible();

    // Verify error alert
    await expect(applyChangesPage.errorAlert).toBeVisible();
  });

  test('should display error details when apply fails', async ({ page }) => {
    // Mock apply API to return error
    await page.route('**/api/contracts/apply', async (route) => {
      await route.fulfill(mockApplyApiResponses.databaseError);
    });

    await applyChangesPage.navigate();
    await applyChangesPage.waitForApplyToComplete();

    // Verify error details section
    const errorText = await page.textContent('text=Error Details');
    expect(errorText).toBeTruthy();
  });

  test('should show helpful guidance on error', async ({ page }) => {
    // Mock apply API to return error
    await page.route('**/api/contracts/apply', async (route) => {
      await route.fulfill(mockApplyApiResponses.databaseError);
    });

    await applyChangesPage.navigate();
    await applyChangesPage.waitForApplyToComplete();

    // Verify guidance section is present
    await expect(page.getByText('What to do next:')).toBeVisible();
    await expect(page.getByText('Verify that all contracts pass validation')).toBeVisible();
    await expect(page.getByText('Check that the Neo4j database is running and accessible')).toBeVisible();
  });

  test('should show Back to Validation button on error', async ({ page }) => {
    // Mock apply API to return error
    await page.route('**/api/contracts/apply', async (route) => {
      await route.fulfill(mockApplyApiResponses.validationFailed);
    });

    await applyChangesPage.navigate();
    await applyChangesPage.waitForApplyToComplete();

    // Verify button is visible
    await expect(applyChangesPage.backToValidationButton).toBeVisible();

    // Click button and verify navigation
    await applyChangesPage.backToValidationButton.click();
    await expect(page).toHaveURL('/validation');
  });

  test('should show Try Again button on error', async ({ page }) => {
    // Mock apply API to return error
    await page.route('**/api/contracts/apply', async (route) => {
      await route.fulfill(mockApplyApiResponses.databaseError);
    });

    await applyChangesPage.navigate();
    await applyChangesPage.waitForApplyToComplete();

    // Verify button is visible
    await expect(applyChangesPage.tryAgainButton).toBeVisible();
  });

  test('should retry apply when Try Again button is clicked', async ({ page }) => {
    let attemptCount = 0;

    // Mock apply API to fail first time, succeed second time
    await page.route('**/api/contracts/apply', async (route) => {
      // Only handle POST requests
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }
      
      attemptCount++;
      if (attemptCount === 2) {
        // First attempt: simulate network/server error by aborting
        await route.abort('failed');
      } else {
        // Second attempt: return success
        await route.fulfill(mockApplyApiResponses.success);
      }
    });

    await applyChangesPage.navigate();
    
    // Wait for the page to load and request to complete
    await page.waitForLoadState('networkidle');
    
    // Verify Try Again button is visible
    await expect(applyChangesPage.tryAgainButton).toBeVisible();

    // Verify error state
    const hasFailed = await applyChangesPage.isApplyFailed();
    expect(hasFailed).toBe(true);

    // Click Try Again
    await applyChangesPage.tryAgainButton.click();

    // Wait for success state
    await expect(applyChangesPage.successIcon).toBeVisible({ timeout: 10000 });

    // Verify success state
    const isSuccessful = await applyChangesPage.isApplySuccessful();
    expect(isSuccessful).toBe(true);

    // Verify we made 2 attempts
    expect(attemptCount).toBe(3);
  });

  test('should handle validation failed error (400)', async ({ page }) => {
    // Mock apply API to return validation error
    await page.route('**/api/contracts/apply', async (route) => {
      await route.fulfill(mockApplyApiResponses.validationFailed);
    });

    await applyChangesPage.navigate();
    await applyChangesPage.waitForApplyToComplete();

    // Verify error state
    const hasFailed = await applyChangesPage.isApplyFailed();
    expect(hasFailed).toBe(true);

    // Verify error message
    await expect(applyChangesPage.errorAlert).toBeVisible();
  });

  test('should handle network failure gracefully', async ({ page }) => {
    // Mock network failure
    await page.route('**/api/contracts/apply', async (route) => {
      await route.abort('failed');
    });

    await applyChangesPage.navigate();
    await applyChangesPage.waitForApplyToComplete();

    // Verify error state
    const hasFailed = await applyChangesPage.isApplyFailed();
    expect(hasFailed).toBe(true);

    // Verify error alert is displayed
    await expect(applyChangesPage.errorAlert).toBeVisible();
  });

  test('should display success with single module', async ({ page }) => {
    // Mock apply API response with single module
    await page.route('**/api/contracts/apply', async (route) => {
      await route.fulfill(mockApplyApiResponses.successSingleModule);
    });

    await applyChangesPage.navigate();
    await applyChangesPage.waitForApplyToComplete();

    // Verify success state
    const isSuccessful = await applyChangesPage.isApplySuccessful();
    expect(isSuccessful).toBe(true);

    // Verify statistics
    const results = await applyChangesPage.getApplyResults();
    expect(results.modulesProcessed).toBe(1);
    expect(results.partsProcessed).toBe(3);
  });

  test('should display success with many modules', async ({ page }) => {
    // Mock apply API response with many modules
    await page.route('**/api/contracts/apply', async (route) => {
      await route.fulfill(mockApplyApiResponses.successManyModules);
    });

    await applyChangesPage.navigate();
    await applyChangesPage.waitForApplyToComplete();

    // Verify success state
    const isSuccessful = await applyChangesPage.isApplySuccessful();
    expect(isSuccessful).toBe(true);

    // Verify statistics
    const results = await applyChangesPage.getApplyResults();
    expect(results.modulesProcessed).toBe(25);
    expect(results.partsProcessed).toBe(87);
  });

  test('should display page title and subtitle', async ({ page }) => {
    // Mock apply API response
    await page.route('**/api/contracts/apply', async (route) => {
      await route.fulfill(mockApplyApiResponses.success);
    });

    await applyChangesPage.navigate();

    // Verify title and subtitle
    await expect(applyChangesPage.pageTitle).toBeVisible();
    await expect(applyChangesPage.pageTitle).toHaveText('Apply Contract Changes');
    await expect(applyChangesPage.pageSubtitle).toBeVisible();
  });

  test('should handle service unavailable error (503)', async ({ page }) => {
    // Mock apply API to return service unavailable
    await page.route('**/api/contracts/apply', async (route) => {
      await route.fulfill(mockApplyApiResponses.serviceUnavailable);
    });

    await applyChangesPage.navigate();
    await applyChangesPage.waitForApplyToComplete();

    // Verify error state
    const hasFailed = await applyChangesPage.isApplyFailed();
    expect(hasFailed).toBe(true);

    // Verify Try Again button is available
    await expect(applyChangesPage.tryAgainButton).toBeVisible();
  });
});

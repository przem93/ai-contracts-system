import { test, expect } from '@playwright/test';
import { ValidationPage } from './pages/ValidationPage';
import { LoadingSpinner } from './components/LoadingSpinner';
import { Alert } from './components/Alert';
import { mockValidationApiResponses, mockValidationResponses } from './fixtures/validation-data';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

test.describe('Validation Page', () => {
  let validationPage: ValidationPage;

  test.beforeEach(async ({ page }) => {
    validationPage = new ValidationPage(page);
  });

  test('should load the page successfully', async ({ page }) => {
    // Mock API response
    await page.route('**/api/contracts/validate', async (route) => {
      await route.fulfill(mockValidationApiResponses.successAllValid);
    });

    await validationPage.navigate();
    
    // Wait for React to render the root element
    await page.waitForSelector('#root', { state: 'attached' });
    
    // Wait for the main container to be visible
    await page.waitForSelector('[class*="MuiContainer"]', { timeout: 10000 });
    
    // Verify main page elements are visible
    await expect(validationPage.pageTitle).toBeVisible({ timeout: 10000 });
    await expect(validationPage.pageTitle).toHaveText('Contract Validation');
    
    await expect(validationPage.pageSubtitle).toBeVisible();
    await expect(validationPage.pageSubtitle).toContainText('Review validation results for all contract files');
  });

  test('should show loading spinner while fetching validation results', async ({ page }) => {
    try {
      // Mock API with delay
      await page.route('**/api/contracts/validate', async (route) => {
        await delay(10000);
        await route.fulfill(mockValidationApiResponses.successAllValid);
      });

      await validationPage.navigate();

      const spinner = new LoadingSpinner(validationPage.loadingSpinner);
      await spinner.verifyIsVisible();
    } finally {
      await page.unrouteAll({ behavior: 'ignoreErrors' });
    }
  });

  test('should display overall success status when all contracts are valid', async ({ page }) => {
    // Mock API response with all valid contracts
    await page.route('**/api/contracts/validate', async (route) => {
      await route.fulfill(mockValidationApiResponses.successAllValid);
    });

    await validationPage.navigate();
    await validationPage.waitForValidationToLoad();

    // Verify overall success status
    const isSuccess = await validationPage.isOverallValidationSuccessful();
    expect(isSuccess).toBe(true);

    // Verify success icon is visible
    await expect(validationPage.successIcon).toBeVisible();

    // Verify status title
    const title = await validationPage.getOverallStatusTitle();
    expect(title).toContain('All Contracts Valid');

    // Verify status description
    const description = await validationPage.getOverallStatusDescription();
    expect(description).toContain('2');
    expect(description).toContain('contract files passed validation');
  });

  test('should display overall error status when some contracts are invalid', async ({ page }) => {
    // Mock API response with some invalid contracts
    await page.route('**/api/contracts/validate', async (route) => {
      await route.fulfill(mockValidationApiResponses.successSomeInvalid);
    });

    await validationPage.navigate();
    await validationPage.waitForValidationToLoad();

    // Verify overall error status
    const hasErrors = await validationPage.hasOverallValidationErrors();
    expect(hasErrors).toBe(true);

    // Verify error icon is visible
    await expect(validationPage.errorIcon).toBeVisible();

    // Verify status title
    const title = await validationPage.getOverallStatusTitle();
    expect(title).toContain('Validation Errors Found');

    // Verify status description shows error count
    const description = await validationPage.getOverallStatusDescription();
    expect(description).toContain('2 of 3 contracts have errors');
  });

  test('should display individual contract validation results', async ({ page }) => {
    // Mock API response with all valid contracts
    await page.route('**/api/contracts/validate', async (route) => {
      await route.fulfill(mockValidationApiResponses.successAllValid);
    });

    await validationPage.navigate();
    await validationPage.waitForValidationToLoad();

    // Verify contract cards are displayed
    const count = await validationPage.getContractCardsCount();
    expect(count).toBe(2);

    // Verify first contract details
    const firstContract = await validationPage.getContractValidationDetails(0);
    expect(firstContract.fileName).toBe('valid-contract.yml');
    expect(firstContract.filePath).toBe('/contracts/valid-contract.yml');
    expect(firstContract.isValid).toBe(true);
    expect(firstContract.statusChip).toBe('Valid');
    expect(firstContract.errors).toHaveLength(0);

    // Verify second contract details
    const secondContract = await validationPage.getContractValidationDetails(1);
    expect(secondContract.fileName).toBe('valid-dependency.yml');
    expect(secondContract.filePath).toBe('/contracts/valid-dependency.yml');
    expect(secondContract.isValid).toBe(true);
    expect(secondContract.statusChip).toBe('Valid');
    expect(secondContract.errors).toHaveLength(0);
  });

  test('should display validation errors for invalid contracts', async ({ page }) => {
    // Mock API response with invalid contracts
    await page.route('**/api/contracts/validate', async (route) => {
      await route.fulfill(mockValidationApiResponses.successSomeInvalid);
    });

    await validationPage.navigate();
    await validationPage.waitForValidationToLoad();

    // Verify contract with type mismatch error
    const invalidContract = await validationPage.getContractValidationDetails(1);
    expect(invalidContract.fileName).toBe('invalid-type-mismatch.yml');
    expect(invalidContract.isValid).toBe(false);
    expect(invalidContract.statusChip).toBe('Invalid');
    expect(invalidContract.errors).toHaveLength(1);
    expect(invalidContract.errors[0].message).toContain('Part type mismatch');
    expect(invalidContract.errors[0].path).toBe('dependencies[0].parts[0].type');
  });

  test('should display multiple validation errors for a single contract', async ({ page }) => {
    // Mock API response with contract having multiple errors
    await page.route('**/api/contracts/validate', async (route) => {
      await route.fulfill(mockValidationApiResponses.successMixedErrors);
    });

    await validationPage.navigate();
    await validationPage.waitForValidationToLoad();

    // Find the contract with multiple errors
    const multiErrorContract = await validationPage.getContractValidationDetails(3);
    expect(multiErrorContract.fileName).toBe('invalid-multiple-errors.yml');
    expect(multiErrorContract.isValid).toBe(false);
    expect(multiErrorContract.errors).toHaveLength(3);
    
    // Verify all three errors are present
    expect(multiErrorContract.errors[0].message).toContain('Contract must have a type');
    expect(multiErrorContract.errors[1].message).toContain('Contract must have a category');
    expect(multiErrorContract.errors[2].message).toContain('Contract must have a description');
  });

  test('should show success alert for valid contracts', async ({ page }) => {
    // Mock API response with all valid contracts
    await page.route('**/api/contracts/validate', async (route) => {
      await route.fulfill(mockValidationApiResponses.successAllValid);
    });

    await validationPage.navigate();
    await validationPage.waitForValidationToLoad();

    // Verify success alert is shown for first valid contract
    const hasSuccessAlert = await validationPage.hasSuccessAlertForContract(0);
    expect(hasSuccessAlert).toBe(true);
  });

  test('should show error section for invalid contracts', async ({ page }) => {
    // Mock API response with invalid contracts
    await page.route('**/api/contracts/validate', async (route) => {
      await route.fulfill(mockValidationApiResponses.successSomeInvalid);
    });

    await validationPage.navigate();
    await validationPage.waitForValidationToLoad();

    // Verify error section is shown for invalid contract (index 1)
    const hasErrorSection = await validationPage.hasErrorSectionForContract(1);
    expect(hasErrorSection).toBe(true);
  });

  test('should show "No contract files found" message when no files exist', async ({ page }) => {
    // Mock API response with no files
    await page.route('**/api/contracts/validate', async (route) => {
      await route.fulfill(mockValidationApiResponses.successNoFiles);
    });

    await validationPage.navigate();
    await validationPage.waitForValidationToLoad();

    // Verify "no files" alert is displayed
    const noFilesAlert = new Alert(validationPage.noFilesAlert);
    await noFilesAlert.verifyIsVisible();
    await noFilesAlert.verifyText('No contract files found to validate');
  });

  test('should handle API error gracefully', async ({ page }) => {
    // Mock API to return error
    await page.route('**/api/contracts/validate', async (route) => {
      await route.fulfill(mockValidationApiResponses.serverError);
    });

    await validationPage.navigate();
    await validationPage.waitForValidationToLoad();

    // Verify error alert is displayed
    const errorAlert = new Alert(validationPage.errorAlert);
    await errorAlert.verifyIsVisible();
    await errorAlert.verifyText('Error loading validation results');
  });

  test('should handle network failure gracefully', async ({ page }) => {
    // Mock network failure
    await page.route('**/api/contracts/validate', async (route) => {
      await route.abort('failed');
    });

    await validationPage.navigate();
    await validationPage.waitForValidationToLoad();

    // Verify error alert is displayed
    const errorAlert = new Alert(validationPage.errorAlert);
    await errorAlert.verifyIsVisible();
    await errorAlert.verifyText('Error loading validation results');
  });

  test('should display correct number of valid and invalid contracts', async ({ page }) => {
    // Mock API response with mixed validation results
    await page.route('**/api/contracts/validate', async (route) => {
      await route.fulfill(mockValidationApiResponses.successMixedErrors);
    });

    await validationPage.navigate();
    await validationPage.waitForValidationToLoad();

    // Verify total contract count
    const totalCount = await validationPage.getContractCardsCount();
    expect(totalCount).toBe(5);

    // Count valid and invalid contracts
    let validCount = 0;
    let invalidCount = 0;

    for (let i = 0; i < totalCount; i++) {
      const details = await validationPage.getContractValidationDetails(i);
      if (details.isValid) {
        validCount++;
      } else {
        invalidCount++;
      }
    }

    expect(validCount).toBe(2);
    expect(invalidCount).toBe(3);

    // Verify description matches
    const description = await validationPage.getOverallStatusDescription();
    expect(description).toContain('3 of 5 contracts have errors');
  });

  test('should display all contract files regardless of validation status', async ({ page }) => {
    // Mock API response with all contracts invalid
    await page.route('**/api/contracts/validate', async (route) => {
      await route.fulfill(mockValidationApiResponses.successAllInvalid);
    });

    await validationPage.navigate();
    await validationPage.waitForValidationToLoad();

    // Verify all invalid contracts are still displayed
    const count = await validationPage.getContractCardsCount();
    expect(count).toBe(3);

    // Verify all are marked as invalid
    for (let i = 0; i < count; i++) {
      const details = await validationPage.getContractValidationDetails(i);
      expect(details.isValid).toBe(false);
      expect(details.errors.length).toBeGreaterThan(0);
    }
  });

  test('should display error details with path and message', async ({ page }) => {
    // Mock API response with specific error types
    await page.route('**/api/contracts/validate', async (route) => {
      await route.fulfill(mockValidationApiResponses.successSingleInvalid);
    });

    await validationPage.navigate();
    await validationPage.waitForValidationToLoad();

    // Get the invalid contract details
    const details = await validationPage.getContractValidationDetails(0);
    
    // Verify error has both message and path
    expect(details.errors).toHaveLength(1);
    expect(details.errors[0].message).toBeTruthy();
    expect(details.errors[0].message).toContain('Part type mismatch');
    expect(details.errors[0].path).toBeTruthy();
    expect(details.errors[0].path).toBe('dependencies[0].parts[0].type');
  });

  test('should use correct styling for valid and invalid contracts', async ({ page }) => {
    // Mock API response with mixed validation results
    await page.route('**/api/contracts/validate', async (route) => {
      await route.fulfill(mockValidationApiResponses.successSomeInvalid);
    });

    await validationPage.navigate();
    await validationPage.waitForValidationToLoad();

    // Valid contract should have success icon and green chip
    const validCard = validationPage.contractCards.nth(0);
    const validSuccessIcon = validCard.locator('[data-testid="CheckCircleIcon"]');
    const validChip = validCard.locator('[class*="MuiChip-colorSuccess"]');
    
    await expect(validSuccessIcon).toBeVisible();
    await expect(validChip).toBeVisible();

    // Invalid contract should have error icon and red chip
    const invalidCard = validationPage.contractCards.nth(1);
    const invalidErrorIcon = invalidCard.locator('[data-testid="ErrorIcon"]');
    const invalidChip = invalidCard.locator('[class*="MuiChip-colorError"]');
    
    await expect(invalidErrorIcon).toBeVisible();
    await expect(invalidChip).toBeVisible();
  });

  test('should verify contract validation using helper method', async ({ page }) => {
    // Mock API response
    await page.route('**/api/contracts/validate', async (route) => {
      await route.fulfill(mockValidationApiResponses.successSomeInvalid);
    });

    await validationPage.navigate();
    await validationPage.waitForValidationToLoad();

    // Use helper method to verify specific contracts
    const hasValidContract = await validationPage.verifyContractValidation({
      fileName: 'valid-contract.yml',
      isValid: true,
    });
    expect(hasValidContract).toBe(true);

    const hasInvalidContract = await validationPage.verifyContractValidation({
      fileName: 'invalid-type-mismatch.yml',
      isValid: false,
      hasErrors: true,
    });
    expect(hasInvalidContract).toBe(true);
  });
});

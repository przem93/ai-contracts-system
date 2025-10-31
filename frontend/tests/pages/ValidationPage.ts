import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page object for the Validation page
 * Provides methods to interact with and verify the contract validation functionality
 */
export class ValidationPage extends BasePage {
  // Page elements
  readonly pageTitle: Locator;
  readonly pageSubtitle: Locator;
  readonly loadingSpinner: Locator;
  readonly errorAlert: Locator;
  readonly noFilesAlert: Locator;
  
  // Overall validation status card
  readonly overallStatusCard: Locator;
  readonly successIcon: Locator;
  readonly errorIcon: Locator;
  readonly overallStatusTitle: Locator;
  readonly overallStatusDescription: Locator;
  
  // Individual contract validation cards
  readonly contractCards: Locator;

  constructor(page: Page) {
    super(page);
    
    // Initialize locators
    this.pageTitle = page.getByRole('heading', { name: 'Contract Validation', level: 4 });
    this.pageSubtitle = page.getByText('Review validation results for all contract files');
    this.loadingSpinner = page.getByRole('progressbar');
    this.errorAlert = page.locator('[role="alert"]').filter({ hasText: 'Error loading validation results' });
    this.noFilesAlert = page.locator('[role="alert"]').filter({ hasText: 'No contract files found to validate' });
    
    // Overall validation status
    this.overallStatusCard = page.locator('.MuiCard-root').first();
    this.successIcon = page.locator('[data-testid="CheckCircleIcon"]').first();
    this.errorIcon = page.locator('[data-testid="ErrorIcon"]').first();
    this.overallStatusTitle = page.getByRole('heading', { level: 6 }).first();
    this.overallStatusDescription = this.overallStatusCard.locator('p').filter({ hasText: /contract.*validation/ });
    
    // Individual contract cards
    this.contractCards = page.locator('.MuiCard-root[class*="MuiCard-outlined"]');
  }

  /**
   * Navigate to the validation page
   */
  async navigate() {
    await this.goto('/validation');
    await this.waitForPageLoad();
    // Wait for React root element to be present
    await this.page.waitForSelector('#root', { state: 'attached', timeout: 10000 });
    // Wait for the main container to render
    await this.page.waitForSelector('[class*="MuiContainer"]', { timeout: 10000 });
  }

  /**
   * Wait for validation results to finish loading
   */
  async waitForValidationToLoad() {
    // Wait for loading spinner to disappear
    await this.loadingSpinner.waitFor({ state: 'hidden', timeout: 10000 });
  }

  /**
   * Check if the page loaded successfully
   */
  async isPageLoaded(): Promise<boolean> {
    try {
      await expect(this.pageTitle).toBeVisible();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if loading spinner is visible
   */
  async isLoading(): Promise<boolean> {
    return await this.loadingSpinner.isVisible();
  }

  /**
   * Check if error is displayed
   */
  async hasError(): Promise<boolean> {
    return await this.errorAlert.isVisible();
  }

  /**
   * Get error message text
   */
  async getErrorMessage(): Promise<string> {
    return await this.errorAlert.textContent() || '';
  }

  /**
   * Check if "no files" message is displayed
   */
  async hasNoFiles(): Promise<boolean> {
    return await this.noFilesAlert.isVisible();
  }

  /**
   * Check if overall validation is successful
   */
  async isOverallValidationSuccessful(): Promise<boolean> {
    try {
      await expect(this.successIcon).toBeVisible();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if overall validation has errors
   */
  async hasOverallValidationErrors(): Promise<boolean> {
    try {
      await expect(this.errorIcon).toBeVisible();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get overall status title text
   */
  async getOverallStatusTitle(): Promise<string> {
    return await this.overallStatusTitle.textContent() || '';
  }

  /**
   * Get overall status description text
   */
  async getOverallStatusDescription(): Promise<string> {
    return await this.overallStatusDescription.textContent() || '';
  }

  /**
   * Get the number of contract cards displayed
   */
  async getContractCardsCount(): Promise<number> {
    await this.waitForValidationToLoad();
    return await this.contractCards.count();
  }

  /**
   * Get details of a specific contract validation by index
   */
  async getContractValidationDetails(index: number): Promise<{
    fileName: string;
    filePath: string;
    isValid: boolean;
    statusChip: string;
    errors: Array<{ message: string; path: string }>;
  }> {
    const contractCard = this.contractCards.nth(index);
    await expect(contractCard).toBeVisible();

    const fileName = await contractCard.locator('h6').textContent() || '';
    const filePath = await contractCard.locator('text=/Path:/').textContent() || '';
    
    // Check if valid by looking for the chip
    const statusChip = await contractCard.locator('[class*="MuiChip-root"]').textContent() || '';
    const isValid = statusChip === 'Valid';

    // Extract errors if present
    const errors: Array<{ message: string; path: string }> = [];
    if (!isValid) {
      const errorItems = contractCard.locator('[class*="MuiListItem-root"]');
      const errorCount = await errorItems.count();
      
      for (let i = 0; i < errorCount; i++) {
        const errorItem = errorItems.nth(i);
        const primaryText = await errorItem.locator('[class*="MuiListItemText-primary"]').textContent() || '';
        const secondaryText = await errorItem.locator('[class*="MuiListItemText-secondary"]').textContent() || '';
        
        errors.push({
          message: primaryText,
          path: secondaryText.replace('Path: ', ''),
        });
      }
    }

    return {
      fileName: fileName.trim(),
      filePath: filePath.replace('Path: ', '').trim(),
      isValid,
      statusChip,
      errors,
    };
  }

  /**
   * Verify a contract exists with specific validation result
   */
  async verifyContractValidation(expectedDetails: {
    fileName?: string;
    isValid?: boolean;
    hasErrors?: boolean;
  }): Promise<boolean> {
    const count = await this.getContractCardsCount();

    for (let i = 0; i < count; i++) {
      const details = await this.getContractValidationDetails(i);
      
      if (
        (!expectedDetails.fileName || details.fileName.includes(expectedDetails.fileName)) &&
        (expectedDetails.isValid === undefined || details.isValid === expectedDetails.isValid) &&
        (expectedDetails.hasErrors === undefined || (details.errors.length > 0) === expectedDetails.hasErrors)
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Verify success alert is shown for valid contract
   */
  async hasSuccessAlertForContract(index: number): Promise<boolean> {
    const contractCard = this.contractCards.nth(index);
    const successAlert = contractCard.locator('[role="alert"]').filter({ hasText: 'Contract passed all validation checks' });
    
    try {
      await expect(successAlert).toBeVisible();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Verify error section is shown for invalid contract
   */
  async hasErrorSectionForContract(index: number): Promise<boolean> {
    const contractCard = this.contractCards.nth(index);
    const errorSection = contractCard.locator('text=/Validation Errors:/');
    
    try {
      await expect(errorSection).toBeVisible();
      return true;
    } catch {
      return false;
    }
  }
}

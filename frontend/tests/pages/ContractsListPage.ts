import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page object for the Contracts List page
 * Provides methods to interact with and verify the contracts listing functionality
 */
export class ContractsListPage extends BasePage {
  // Page elements
  readonly pageTitle: Locator;
  readonly pageSubtitle: Locator;
  readonly contractsCard: Locator;
  readonly contractsCardTitle: Locator;
  readonly loadingSpinner: Locator;
  readonly errorAlert: Locator;
  readonly noContractsAlert: Locator;
  readonly contractCards: Locator;
  readonly verifyContractsButton: Locator;
  readonly checkModifiedErrorAlert: Locator;
  readonly noChangesAlert: Locator;

  constructor(page: Page) {
    super(page);
    
    // Initialize locators
    this.pageTitle = page.getByRole('heading', { name: 'AI Contracts System', level: 1 });
    this.pageSubtitle = page.getByRole('heading', { name: 'AI Coder Agent Contract Systems', level: 5 });
    this.contractsCard = page.locator('.MuiCard-root').first();
    this.contractsCardTitle = page.getByRole('heading', { name: '📋 Modified/New Contracts' });
    this.loadingSpinner = page.getByRole('progressbar');
    this.errorAlert = page.locator('[role="alert"]').filter({ hasText: 'Error loading contracts' });
    this.noContractsAlert = page.locator('[role="alert"]').filter({ hasText: 'No modified or new contracts found' });
    this.contractCards = page.getByTestId('contract-card');
    this.verifyContractsButton = page.getByTestId('verify-contracts-button');
    this.checkModifiedErrorAlert = page.locator('[role="alert"]').filter({ hasText: 'Error checking contract modifications' });
    this.noChangesAlert = page.locator('[role="alert"]').filter({ hasText: 'No changes detected' });
  }

  /**
   * Navigate to the contracts list page
   */
  async navigate() {
    await this.goto('/');
    await this.waitForPageLoad();
    // Wait for React root element to be present
    await this.page.waitForSelector('#root', { state: 'attached', timeout: 10000 });
    // Wait for the main container to render
    await this.page.waitForSelector('[class*="MuiContainer"]', { timeout: 10000 });
  }

  /**
   * Wait for contracts to finish loading
   */
  async waitForContractsToLoad() {
    // Wait for loading spinner to disappear
    await this.loadingSpinner.waitFor({ state: 'hidden', timeout: 10000 });
  }

  /**
   * Check if the page loaded successfully
   */
  async isPageLoaded(): Promise<boolean> {
    try {
      await expect(this.pageTitle).toBeVisible();
      await expect(this.contractsCardTitle).toBeVisible();
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
   * Check if "no contracts" message is displayed
   */
  async hasNoContracts(): Promise<boolean> {
    return await this.noContractsAlert.isVisible();
  }

  /**
   * Get the number of contract cards displayed
   */
  async getContractsCount(): Promise<number> {
    await this.waitForContractsToLoad();
    return await this.contractCards.count();
  }

  /**
   * Get details of a specific contract by index
   */
  async getContractDetails(index: number): Promise<{
    fileName: string;
    filePath: string;
    id: string;
    type: string;
    category: string;
  }> {
    const contractCard = this.contractCards.nth(index);
    await expect(contractCard).toBeVisible();

    const fileName = await contractCard.locator('text=/📄/').textContent() || '';
    const filePath = await contractCard.locator('text=/Path:/').textContent() || '';
    const idChip = await contractCard.locator('[class*="MuiChip-root"]').filter({ hasText: 'ID:' }).textContent() || '';
    const typeChip = await contractCard.locator('[class*="MuiChip-root"]').filter({ hasText: 'Type:' }).textContent() || '';
    const categoryChip = await contractCard.locator('[class*="MuiChip-root"]').filter({ hasText: 'Category:' }).textContent() || '';

    return {
      fileName: fileName.replace('📄 ', '').trim(),
      filePath: filePath.replace('Path: ', '').trim(),
      id: idChip.replace('ID: ', '').trim(),
      type: typeChip.replace('Type: ', '').trim(),
      category: categoryChip.replace('Category: ', '').trim(),
    };
  }

  /**
   * Get all contract file names
   */
  async getAllContractFileNames(): Promise<string[]> {
    await this.waitForContractsToLoad();
    const count = await this.getContractsCount();
    const fileNames: string[] = [];

    for (let i = 0; i < count; i++) {
      const details = await this.getContractDetails(i);
      fileNames.push(details.fileName);
    }

    return fileNames;
  }

  /**
   * Verify a contract exists with specific details
   */
  async verifyContractExists(expectedDetails: {
    fileName?: string;
    id?: string;
    type?: string;
    category?: string;
  }): Promise<boolean> {
    const count = await this.getContractsCount();

    for (let i = 0; i < count; i++) {
      const details = await this.getContractDetails(i);
      
      if (
        (!expectedDetails.fileName || details.fileName.includes(expectedDetails.fileName)) &&
        (!expectedDetails.id || details.id === expectedDetails.id) &&
        (!expectedDetails.type || details.type === expectedDetails.type) &&
        (!expectedDetails.category || details.category === expectedDetails.category)
      ) {
        return true;
      }
    }

    return false;
  }
}

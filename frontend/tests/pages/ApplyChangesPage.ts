import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class ApplyChangesPage extends BasePage {
  readonly pageTitle: Locator;
  readonly pageSubtitle: Locator;
  readonly loadingSpinner: Locator;
  readonly successIcon: Locator;
  readonly errorIcon: Locator;
  readonly successCard: Locator;
  readonly errorCard: Locator;
  readonly successMessage: Locator;
  readonly errorMessage: Locator;
  readonly modulesProcessed: Locator;
  readonly partsProcessed: Locator;
  readonly returnToContractsButton: Locator;
  readonly backToValidationButton: Locator;
  readonly tryAgainButton: Locator;
  readonly errorAlert: Locator;

  constructor(page: Page) {
    super(page);
    this.pageTitle = page.getByRole('heading', { name: 'Apply Contract Changes', level: 1 });
    this.pageSubtitle = page.getByText('Applying validated contracts to the Neo4j database');
    this.loadingSpinner = page.locator('circle[class*="MuiCircularProgress"]').first();
    this.successIcon = page.locator('[data-testid="CheckCircleIcon"]');
    this.errorIcon = page.getByTestId("ErrorIcon");
    this.successCard = page.locator('text=Changes Applied Successfully!').locator('..');
    this.errorCard = page.locator('text=Failed to Apply Changes').locator('..');
    this.successMessage = page.getByText('Changes Applied Successfully!');
    this.errorMessage = page.getByText('Failed to Apply Changes');
    this.modulesProcessed = page.getByText(/Modules processed:/);
    this.partsProcessed = page.getByText(/Parts processed:/);
    this.returnToContractsButton = page.getByRole('button', { name: 'Return to Contracts List' });
    this.backToValidationButton = page.getByRole('button', { name: 'Back to Validation' });
    this.tryAgainButton = page.getByTestId('try-again-button');
    this.errorAlert = page.locator('[class*="MuiAlert-standardError"]');
  }

  async navigate() {
    await this.goto('/apply');
  }

  async waitForApplyToComplete() {
    // Wait for either success or error state
    await this.page.waitForSelector(
      '[data-testid="CheckCircleIcon"], [data-testid="ErrorIcon"]',
      { timeout: 10000 }
    );
  }

  async isApplySuccessful(): Promise<boolean> {
    try {
      await this.successIcon.waitFor({ state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  async isApplyFailed(): Promise<boolean> {
    try {
      await this.errorIcon.waitFor({ state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  async getApplyResults() {
    const modulesText = await this.modulesProcessed.textContent();
    const partsText = await this.partsProcessed.textContent();
    
    const modulesMatch = modulesText?.match(/Modules processed:\s*(\d+)/);
    const partsMatch = partsText?.match(/Parts processed:\s*(\d+)/);

    return {
      modulesProcessed: modulesMatch ? parseInt(modulesMatch[1]) : 0,
      partsProcessed: partsMatch ? parseInt(partsMatch[1]) : 0,
    };
  }
}

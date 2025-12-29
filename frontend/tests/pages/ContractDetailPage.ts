import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page object for the Contract Detail page
 */
export class ContractDetailPage extends BasePage {
  readonly backButton: Locator;
  readonly pageTitle: Locator;
  readonly categoryChip: Locator;
  readonly typeChip: Locator;
  readonly description: Locator;
  readonly partsSection: Locator;
  readonly outgoingDependenciesSection: Locator;
  readonly incomingDependenciesSection: Locator;
  readonly errorAlert: Locator;

  constructor(page: Page) {
    super(page);
    this.backButton = page.getByRole('button', { name: 'Back' });
    this.pageTitle = page.getByRole('heading', { level: 1 });
    this.categoryChip = page.locator('.MuiChip-root').first();
    this.typeChip = page.locator('.MuiChip-root').nth(1);
    this.description = page.locator('p').first();
    this.partsSection = page.getByRole('heading', { name: /Parts/ });
    this.outgoingDependenciesSection = page.getByRole('heading', { name: /Outgoing Dependencies/ });
    this.incomingDependenciesSection = page.getByRole('heading', { name: /Incoming Dependencies/ });
    this.errorAlert = page.locator('[role="alert"]');
  }

  /**
   * Navigate to a specific contract detail page
   */
  async navigate(contractId: string) {
    await this.goto(`/contracts/${contractId}`);
    await this.waitForPageLoad();
  }

  /**
   * Click the back button
   */
  async clickBack() {
    await this.backButton.click();
  }

  /**
   * Get the contract title (ID)
   */
  async getContractTitle(): Promise<string> {
    return (await this.pageTitle.textContent()) || '';
  }

  /**
   * Get the number of parts displayed
   */
  async getPartsCount(): Promise<number> {
    const partsTable = this.page.locator('table').first();
    if (!(await partsTable.isVisible())) return 0;
    const rows = partsTable.locator('tbody tr');
    return await rows.count();
  }

  /**
   * Get the number of outgoing dependencies
   */
  async getOutgoingDependenciesCount(): Promise<number> {
    // Find the outgoing dependencies section
    const section = this.page.locator('h5:has-text("Outgoing Dependencies")').locator('..');
    const dependencies = section.locator('.MuiPaper-root');
    return await dependencies.count();
  }

  /**
   * Get the number of incoming dependencies
   */
  async getIncomingDependenciesCount(): Promise<number> {
    // Find the incoming dependencies section
    const section = this.page.locator('h5:has-text("Incoming Dependencies")').locator('..');
    const dependencies = section.locator('.MuiPaper-root');
    return await dependencies.count();
  }

  /**
   * Verify if error alert is visible
   */
  async hasError(): Promise<boolean> {
    return await this.errorAlert.isVisible();
  }
}

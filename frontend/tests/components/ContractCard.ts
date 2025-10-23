import { Locator, expect } from '@playwright/test';

/**
 * Component class representing a single contract card
 * Provides methods to interact with and verify contract card elements
 */
export class ContractCard {
  readonly container: Locator;
  readonly fileName: Locator;
  readonly filePath: Locator;
  readonly idChip: Locator;
  readonly typeChip: Locator;
  readonly categoryChip: Locator;

  constructor(cardLocator: Locator) {
    this.container = cardLocator;
    this.fileName = cardLocator.locator('text=/📄/');
    this.filePath = cardLocator.locator('text=/Path:/');
    this.idChip = cardLocator.locator('[class*="MuiChip-root"]').filter({ hasText: 'ID:' });
    this.typeChip = cardLocator.locator('[class*="MuiChip-root"]').filter({ hasText: 'Type:' });
    this.categoryChip = cardLocator.locator('[class*="MuiChip-root"]').filter({ hasText: 'Category:' });
  }

  /**
   * Verify the card is visible
   */
  async isVisible(): Promise<boolean> {
    return await this.container.isVisible();
  }

  /**
   * Get the file name from the card
   */
  async getFileName(): Promise<string> {
    const text = await this.fileName.textContent() || '';
    return text.replace('📄 ', '').trim();
  }

  /**
   * Get the file path from the card
   */
  async getFilePath(): Promise<string> {
    const text = await this.filePath.textContent() || '';
    return text.replace('Path: ', '').trim();
  }

  /**
   * Get the contract ID
   */
  async getId(): Promise<string> {
    const text = await this.idChip.textContent() || '';
    return text.replace('ID: ', '').trim();
  }

  /**
   * Get the contract type
   */
  async getType(): Promise<string> {
    const text = await this.typeChip.textContent() || '';
    return text.replace('Type: ', '').trim();
  }

  /**
   * Get the contract category
   */
  async getCategory(): Promise<string> {
    const text = await this.categoryChip.textContent() || '';
    return text.replace('Category: ', '').trim();
  }

  /**
   * Verify all chips are displayed
   */
  async verifyChipsAreVisible() {
    await expect(this.idChip).toBeVisible();
    await expect(this.typeChip).toBeVisible();
    await expect(this.categoryChip).toBeVisible();
  }

  /**
   * Get all contract details as an object
   */
  async getDetails(): Promise<{
    fileName: string;
    filePath: string;
    id: string;
    type: string;
    category: string;
  }> {
    return {
      fileName: await this.getFileName(),
      filePath: await this.getFilePath(),
      id: await this.getId(),
      type: await this.getType(),
      category: await this.getCategory(),
    };
  }
}

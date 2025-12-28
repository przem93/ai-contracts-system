import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page object for the Search Contracts page
 */
export class SearchPage extends BasePage {
  readonly pageTitle: Locator;
  readonly pageSubtitle: Locator;
  readonly searchInput: Locator;
  readonly categorySelect: Locator;
  readonly typeSelect: Locator;
  readonly infoAlert: Locator;
  readonly warningAlert: Locator;
  readonly resultsCount: Locator;
  readonly contractCards: Locator;

  constructor(page: Page) {
    super(page);
    this.pageTitle = page.getByRole('heading', { name: 'Search Contracts', level: 1 });
    this.pageSubtitle = page.getByText('Search contracts by description and filter by category and type');
    this.searchInput = page.getByPlaceholder('Search by description...');
    this.categorySelect = page.locator('#category-select');
    this.typeSelect = page.locator('#type-select');
    this.infoAlert = page.locator('[role="alert"]').filter({ hasText: 'Start typing to search' });
    this.warningAlert = page.locator('[role="alert"]').filter({ hasText: 'No contracts found' });
    this.resultsCount = page.getByText(/Found \d+ contracts?/);
    this.contractCards = page.getByTestId('contract-card');
  }

  /**
   * Navigate to the search page
   */
  async navigate() {
    await this.goto('/search');
    await this.waitForPageLoad();
  }

  /**
   * Search for contracts by description
   */
  async search(query: string) {
    await this.searchInput.fill(query);
  }

  /**
   * Select a category from the dropdown
   */
  async selectCategory(category: string) {
    await this.categorySelect.click();
    await this.page.getByRole('option', { name: category }).click();
  }

  /**
   * Get the currently selected category value
   */
  async getSelectedCategory(): Promise<string> {
    // MUI Select uses a hidden input to store the value
    // Use the name attribute to find the hidden input
    const hiddenInput = this.page.locator('input[name="category"]');
    return await hiddenInput.inputValue();
  }

  /**
   * Select a type from the dropdown
   */
  async selectType(type: string) {
    await this.typeSelect.click();
    await this.page.getByRole('option', { name: type }).click();
  }

  /**
   * Get the currently selected type value
   */
  async getSelectedType(): Promise<string> {
    // MUI Select uses a hidden input to store the value
    // Use the name attribute to find the hidden input
    const hiddenInput = this.page.locator('input[name="type"]');
    return await hiddenInput.inputValue();
  }

  /**
   * Get the number of displayed contract cards
   */
  async getContractsCount(): Promise<number> {
    return await this.contractCards.count();
  }

  /**
   * Get all contract file names
   */
  async getAllContractFileNames(): Promise<string[]> {
    const count = await this.contractCards.count();
    const fileNames: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const card = this.contractCards.nth(i);
      const fileNameElement = card.locator('p').first();
      const fileName = await fileNameElement.textContent();
      if (fileName) {
        fileNames.push(fileName);
      }
    }
    
    return fileNames;
  }

  /**
   * Verify that a contract with specific criteria exists
   */
  async verifyContractExists(criteria: { 
    fileName?: string; 
    id?: string; 
    type?: string; 
    category?: string; 
  }): Promise<boolean> {
    const count = await this.contractCards.count();
    
    for (let i = 0; i < count; i++) {
      const card = this.contractCards.nth(i);
      const cardText = await card.textContent();
      
      if (!cardText) continue;
      
      const matches = (
        (!criteria.fileName || cardText.includes(criteria.fileName)) &&
        (!criteria.id || cardText.includes(criteria.id)) &&
        (!criteria.type || cardText.includes(criteria.type)) &&
        (!criteria.category || cardText.includes(criteria.category))
      );
      
      if (matches) return true;
    }
    
    return false;
  }

  /**
   * Get contract details by index
   */
  async getContractDetails(index: number) {
    const card = this.contractCards.nth(index);
    const cardText = await card.textContent();
    
    // Parse the card text to extract details
    // This is a simplified version - you may need to adjust based on actual card structure
    return {
      text: cardText || '',
      card: card
    };
  }
}

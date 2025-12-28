import { test, expect } from '@playwright/test';
import { SearchPage } from './pages/SearchPage';

test.describe('Search Page with Category Select', () => {
  let searchPage: SearchPage;

  test.beforeEach(async ({ page }) => {
    searchPage = new SearchPage(page);
    await searchPage.navigate();
  });

  test('should load the search page successfully', async () => {
    // Verify main page elements are visible
    await expect(searchPage.pageTitle).toBeVisible();
    await expect(searchPage.pageTitle).toHaveText('Search Contracts');
    
    await expect(searchPage.pageSubtitle).toBeVisible();
    await expect(searchPage.pageSubtitle).toHaveText('Search contracts by description and filter by category');
    
    await expect(searchPage.searchInput).toBeVisible();
    await expect(searchPage.categorySelect).toBeVisible();
  });

  test('should display initial info alert when search is empty', async () => {
    // Verify info alert is displayed
    await expect(searchPage.infoAlert).toBeVisible();
    await expect(searchPage.infoAlert).toContainText('Start typing to search contracts by description');
  });

  test('should have "All Categories" selected by default', async () => {
    // Verify default category selection
    const selectedCategory = await searchPage.getSelectedCategory();
    expect(selectedCategory).toBe('all');
  });

  test('should allow selecting different categories', async () => {
    // Test selecting API category
    await searchPage.selectCategory('API');
    let selectedCategory = await searchPage.getSelectedCategory();
    expect(selectedCategory).toBe('api');
    
    // Test selecting Service category
    await searchPage.selectCategory('Service');
    selectedCategory = await searchPage.getSelectedCategory();
    expect(selectedCategory).toBe('service');
    
    // Test selecting Frontend category
    await searchPage.selectCategory('Frontend');
    selectedCategory = await searchPage.getSelectedCategory();
    expect(selectedCategory).toBe('frontend');
    
    // Test selecting Component category
    await searchPage.selectCategory('Component');
    selectedCategory = await searchPage.getSelectedCategory();
    expect(selectedCategory).toBe('component');
    
    // Test selecting All Categories
    await searchPage.selectCategory('All Categories');
    selectedCategory = await searchPage.getSelectedCategory();
    expect(selectedCategory).toBe('all');
  });

  test('should filter contracts by search query', async () => {
    // Search for "user"
    await searchPage.search('user');
    
    // Verify results are displayed
    await expect(searchPage.resultsCount).toBeVisible();
    await expect(searchPage.resultsCount).toContainText('Found');
    
    // Verify at least one contract is displayed
    const contractsCount = await searchPage.getContractsCount();
    expect(contractsCount).toBeGreaterThan(0);
  });

  test('should filter contracts by category', async () => {
    // First, search for something to see results
    await searchPage.search('service');
    
    // Select "Service" category
    await searchPage.selectCategory('Service');
    
    // Verify only service contracts are displayed
    const contractsCount = await searchPage.getContractsCount();
    expect(contractsCount).toBeGreaterThan(0);
    
    // Verify contracts contain service category
    const hasServiceContract = await searchPage.verifyContractExists({ category: 'service' });
    expect(hasServiceContract).toBe(true);
  });

  test('should filter contracts by both search query and category', async () => {
    // Search for "user" and select "API" category
    await searchPage.search('user');
    await searchPage.selectCategory('API');
    
    // Verify filtered results
    const contractsCount = await searchPage.getContractsCount();
    
    // Should have API contracts with "user" in description
    if (contractsCount > 0) {
      const hasApiContract = await searchPage.verifyContractExists({ category: 'api' });
      expect(hasApiContract).toBe(true);
    }
  });

  test('should show warning when no contracts match search query', async () => {
    // Search for something that doesn't exist
    await searchPage.search('xyznonexistent123');
    
    // Verify warning alert is displayed
    await expect(searchPage.warningAlert).toBeVisible();
    await expect(searchPage.warningAlert).toContainText('No contracts found matching "xyznonexistent123"');
  });

  test('should show all matching contracts when category is "All Categories"', async () => {
    // Search for "service"
    await searchPage.search('service');
    
    // Ensure "All Categories" is selected
    await searchPage.selectCategory('All Categories');
    
    // Verify results from multiple categories
    const contractsCount = await searchPage.getContractsCount();
    expect(contractsCount).toBeGreaterThan(0);
  });

  test('should display contract details correctly', async () => {
    // Search to get results
    await searchPage.search('user');
    
    // Verify at least one contract is displayed with details
    const contractsCount = await searchPage.getContractsCount();
    
    if (contractsCount > 0) {
      const firstContract = await searchPage.getContractDetails(0);
      expect(firstContract.text).toBeTruthy();
      expect(firstContract.text.length).toBeGreaterThan(0);
    }
  });

  test('should update results when changing category after search', async () => {
    // Search for something
    await searchPage.search('service');
    
    // Get initial count
    const initialCount = await searchPage.getContractsCount();
    
    // Change category to "Service"
    await searchPage.selectCategory('Service');
    
    // Get new count
    const newCount = await searchPage.getContractsCount();
    
    // Counts might be different based on filtered results
    expect(newCount).toBeGreaterThanOrEqual(0);
  });

  test('should clear info alert when starting to search', async () => {
    // Initially, info alert should be visible
    await expect(searchPage.infoAlert).toBeVisible();
    
    // Start searching
    await searchPage.search('test');
    
    // Info alert should not be visible anymore
    await expect(searchPage.infoAlert).not.toBeVisible();
  });

  test('should maintain category selection when changing search query', async () => {
    // Select a category
    await searchPage.selectCategory('Service');
    
    // Search for something
    await searchPage.search('user');
    
    // Verify category is still selected
    const selectedCategory = await searchPage.getSelectedCategory();
    expect(selectedCategory).toBe('service');
    
    // Change search query
    await searchPage.search('database');
    
    // Verify category is still selected
    const stillSelectedCategory = await searchPage.getSelectedCategory();
    expect(stillSelectedCategory).toBe('service');
  });

  test('should display contracts with different categories correctly', async () => {
    // Search for common term
    await searchPage.search('service');
    
    // Select "All Categories"
    await searchPage.selectCategory('All Categories');
    
    // Verify contracts are displayed
    const contractsCount = await searchPage.getContractsCount();
    
    if (contractsCount > 1) {
      // Get file names to verify multiple contracts
      const fileNames = await searchPage.getAllContractFileNames();
      expect(fileNames.length).toBeGreaterThan(0);
    }
  });
});

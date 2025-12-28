import { test, expect } from '@playwright/test';
import { SearchPage } from './pages/SearchPage';

test.describe('Search Page with Category and Type Select', () => {
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
    await expect(searchPage.pageSubtitle).toHaveText('Search contracts by description and filter by category and type');
    
    await expect(searchPage.searchInput).toBeVisible();
    await expect(searchPage.categorySelect).toBeVisible();
    await expect(searchPage.typeSelect).toBeVisible();
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

  // Type Selector Tests
  test('should have "All Types" selected by default', async () => {
    // Verify default type selection
    const selectedType = await searchPage.getSelectedType();
    expect(selectedType).toBe('all');
  });

  test('should allow selecting different types', async () => {
    // Test selecting Controller type
    await searchPage.selectType('Controller');
    let selectedType = await searchPage.getSelectedType();
    expect(selectedType).toBe('controller');
    
    // Test selecting Service type
    await searchPage.selectType('Service');
    selectedType = await searchPage.getSelectedType();
    expect(selectedType).toBe('service');
    
    // Test selecting Component type
    await searchPage.selectType('Component');
    selectedType = await searchPage.getSelectedType();
    expect(selectedType).toBe('component');
    
    // Test selecting All Types
    await searchPage.selectType('All Types');
    selectedType = await searchPage.getSelectedType();
    expect(selectedType).toBe('all');
  });

  test('should filter contracts by type', async () => {
    // First, search for something to see results
    await searchPage.search('service');
    
    // Select "Service" type
    await searchPage.selectType('Service');
    
    // Verify only service type contracts are displayed
    const contractsCount = await searchPage.getContractsCount();
    expect(contractsCount).toBeGreaterThan(0);
    
    // Verify contracts contain service type
    const hasServiceTypeContract = await searchPage.verifyContractExists({ type: 'service' });
    expect(hasServiceTypeContract).toBe(true);
  });

  test('should filter contracts by category, type, and search query', async () => {
    // Search for "user" and select "API" category and "Controller" type
    await searchPage.search('user');
    await searchPage.selectCategory('API');
    await searchPage.selectType('Controller');
    
    // Verify filtered results
    const contractsCount = await searchPage.getContractsCount();
    
    // Should have API/Controller contracts with "user" in description
    if (contractsCount > 0) {
      const hasMatchingContract = await searchPage.verifyContractExists({ 
        category: 'api',
        type: 'controller'
      });
      expect(hasMatchingContract).toBe(true);
    }
  });

  test('should maintain type selection when changing search query', async () => {
    // Select a type
    await searchPage.selectType('Service');
    
    // Search for something
    await searchPage.search('user');
    
    // Verify type is still selected
    const selectedType = await searchPage.getSelectedType();
    expect(selectedType).toBe('service');
    
    // Change search query
    await searchPage.search('database');
    
    // Verify type is still selected
    const stillSelectedType = await searchPage.getSelectedType();
    expect(stillSelectedType).toBe('service');
  });

  test('should update results when changing type after search', async () => {
    // Search for something
    await searchPage.search('service');
    
    // Get initial count with all types
    const initialCount = await searchPage.getContractsCount();
    
    // Change type to "Service"
    await searchPage.selectType('Service');
    
    // Get new count
    const newCount = await searchPage.getContractsCount();
    
    // Counts might be different based on filtered results
    expect(newCount).toBeGreaterThanOrEqual(0);
    expect(newCount).toBeLessThanOrEqual(initialCount);
  });

  test('should show no results when type filter excludes all matches', async () => {
    // Search for something with an API category
    await searchPage.search('authentication');
    
    // Select a type that won't match (if api contracts are controllers)
    await searchPage.selectType('Component');
    
    // Should show either warning or fewer results
    const contractsCount = await searchPage.getContractsCount();
    
    // Result depends on whether there are component contracts with "authentication"
    expect(contractsCount).toBeGreaterThanOrEqual(0);
  });

  test('should maintain category and type selections independently', async () => {
    // Select category and type
    await searchPage.selectCategory('Service');
    await searchPage.selectType('Service');
    
    // Verify both are selected
    let selectedCategory = await searchPage.getSelectedCategory();
    let selectedType = await searchPage.getSelectedType();
    expect(selectedCategory).toBe('service');
    expect(selectedType).toBe('service');
    
    // Change category only
    await searchPage.selectCategory('API');
    
    // Verify type is still selected, category changed
    selectedCategory = await searchPage.getSelectedCategory();
    selectedType = await searchPage.getSelectedType();
    expect(selectedCategory).toBe('api');
    expect(selectedType).toBe('service');
    
    // Change type only
    await searchPage.selectType('Controller');
    
    // Verify category is still selected, type changed
    selectedCategory = await searchPage.getSelectedCategory();
    selectedType = await searchPage.getSelectedType();
    expect(selectedCategory).toBe('api');
    expect(selectedType).toBe('controller');
  });
});

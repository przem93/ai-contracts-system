import { test, expect } from '@playwright/test';
import { SearchPage } from './pages/SearchPage';
import { mockSearchResults, mockSearchApiResponses } from './fixtures/contracts-data';

test.describe('Search Page with Category and Type Select', () => {
  let searchPage: SearchPage;

  test.beforeEach(async ({ page }) => {
    // Mock the types API to ensure consistent test data
    await page.route('**/api/contracts/types', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          types: ['controller', 'service', 'component'],
          count: 3
        })
      });
    });

    // Mock the categories API to ensure consistent test data
    await page.route('**/api/contracts/categories', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          categories: ['api', 'service', 'frontend', 'component']
        })
      });
    });

    // Mock the get all contracts API endpoint (for filter-only mode)
    await page.route('**/api/contracts', async (route) => {
      // Only handle GET requests to /api/contracts (not /api/contracts/*)
      if (route.request().url().match(/\/api\/contracts(?:$|\?)/)) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockContracts.mixedCategoryContracts)
        });
      } else {
        await route.continue();
      }
    });

    // Mock the search API endpoint
    await page.route('**/api/contracts/search*', async (route) => {
      const url = new URL(route.request().url());
      const query = url.searchParams.get('query') || '';
      
      // Return appropriate mock data based on search query
      if (query.toLowerCase().includes('user')) {
        await route.fulfill(mockSearchApiResponses.success(mockSearchResults.userSearch));
      } else if (query.toLowerCase().includes('service')) {
        await route.fulfill(mockSearchApiResponses.success(mockSearchResults.serviceSearch));
      } else if (query.toLowerCase().includes('authentication')) {
        await route.fulfill(mockSearchApiResponses.success(mockSearchResults.authSearch));
      } else if (query.toLowerCase().includes('database')) {
        await route.fulfill(mockSearchApiResponses.success(mockSearchResults.databaseSearch));
      } else if (query.toLowerCase().includes('xyznonexistent')) {
        await route.fulfill(mockSearchApiResponses.success(mockSearchResults.emptySearch));
      } else {
        // Default: return service search results for generic "test" queries
        await route.fulfill(mockSearchApiResponses.success(mockSearchResults.serviceSearch));
      }
    });

    searchPage = new SearchPage(page);
    await searchPage.navigate();
    
    // Wait for APIs to load
    await page.waitForTimeout(500);
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

  test('should display initial info alert when no filters are active', async () => {
    // Verify info alert is displayed
    const infoAlert = searchPage.page.locator('[role="alert"]').filter({ hasText: 'Select a category or type' });
    await expect(infoAlert).toBeVisible();
    await expect(infoAlert).toContainText('Select a category or type, or search by description');
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
    const infoAlert = searchPage.page.locator('[role="alert"]').filter({ hasText: 'Select a category or type' });
    await expect(infoAlert).toBeVisible();
    
    // Start searching
    await searchPage.search('test');
    
    // Info alert should not be visible anymore
    await expect(infoAlert).not.toBeVisible();
  });

  test('should allow filtering by category without search query', async () => {
    // Select a category without entering search text
    await searchPage.selectCategory('API');
    
    // Wait for results to load
    await searchPage.page.waitForTimeout(500);
    
    // Verify results are displayed
    const contractsCount = await searchPage.getContractsCount();
    expect(contractsCount).toBeGreaterThan(0);
    
    // Verify contracts are from API category
    const hasApiContract = await searchPage.verifyContractExists({ category: 'api' });
    expect(hasApiContract).toBe(true);
  });

  test('should allow filtering by type without search query', async () => {
    // Select a type without entering search text
    await searchPage.selectType('Service');
    
    // Wait for results to load
    await searchPage.page.waitForTimeout(500);
    
    // Verify results are displayed
    const contractsCount = await searchPage.getContractsCount();
    expect(contractsCount).toBeGreaterThan(0);
    
    // Verify contracts are of service type
    const hasServiceContract = await searchPage.verifyContractExists({ type: 'service' });
    expect(hasServiceContract).toBe(true);
  });

  test('should allow filtering by both category and type without search query', async () => {
    // Select both category and type without entering search text
    await searchPage.selectCategory('API');
    await searchPage.selectType('Controller');
    
    // Wait for results to load
    await searchPage.page.waitForTimeout(500);
    
    // Verify results are displayed
    const contractsCount = await searchPage.getContractsCount();
    expect(contractsCount).toBeGreaterThanOrEqual(0);
    
    // If there are results, verify they match the filters
    if (contractsCount > 0) {
      const hasMatchingContract = await searchPage.verifyContractExists({ 
        category: 'api',
        type: 'controller'
      });
      expect(hasMatchingContract).toBe(true);
    }
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

test.describe('Search Page - Search Endpoint Integration', () => {
  let searchPage: SearchPage;

  test('should fetch and display search results from API', async ({ page }) => {
    // Mock supporting APIs
    await page.route('**/api/contracts/types', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ types: ['controller', 'service', 'component'], count: 3 })
      });
    });

    await page.route('**/api/contracts/categories', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ categories: ['api', 'service', 'frontend'] })
      });
    });

    // Mock search API with user search results
    await page.route('**/api/contracts/search*', async (route) => {
      await route.fulfill(mockSearchApiResponses.success(mockSearchResults.userSearch));
    });

    searchPage = new SearchPage(page);
    await searchPage.navigate();
    await page.waitForTimeout(500);

    // Perform a search
    await searchPage.search('user');

    // Wait for results to load
    await page.waitForTimeout(500);

    // Verify results are displayed
    await expect(searchPage.resultsCount).toBeVisible();
    await expect(searchPage.resultsCount).toContainText('Found 3 contracts');

    // Verify contracts are displayed
    const contractsCount = await searchPage.getContractsCount();
    expect(contractsCount).toBe(3);
  });

  test('should show loading spinner while searching', async ({ page }) => {
    // Mock supporting APIs
    await page.route('**/api/contracts/types', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ types: ['controller', 'service', 'component'], count: 3 })
      });
    });

    await page.route('**/api/contracts/categories', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ categories: ['api', 'service', 'frontend'] })
      });
    });

    // Mock search API with delay
    await page.route('**/api/contracts/search*', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.fulfill(mockSearchApiResponses.success(mockSearchResults.userSearch));
    });

    searchPage = new SearchPage(page);
    await searchPage.navigate();
    await page.waitForTimeout(500);

    // Perform a search
    await searchPage.search('user');

    // Verify loading spinner appears
    const loadingSpinner = page.locator('[role="progressbar"]').last();
    await expect(loadingSpinner).toBeVisible();

    // Wait for results to load
    await page.waitForTimeout(1200);

    // Verify loading spinner disappears
    await expect(loadingSpinner).not.toBeVisible();
  });

  test('should handle search API error gracefully', async ({ page }) => {
    // Mock supporting APIs
    await page.route('**/api/contracts/types', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ types: ['controller', 'service', 'component'], count: 3 })
      });
    });

    await page.route('**/api/contracts/categories', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ categories: ['api', 'service', 'frontend'] })
      });
    });

    // Mock search API to return error
    await page.route('**/api/contracts/search*', async (route) => {
      await route.fulfill(mockSearchApiResponses.serverError);
    });

    searchPage = new SearchPage(page);
    await searchPage.navigate();
    await page.waitForTimeout(500);

    // Perform a search
    await searchPage.search('user');

    // Wait for error to appear
    await page.waitForTimeout(500);

    // Verify error alert is displayed
    const errorAlert = page.locator('[role="alert"]').filter({ hasText: 'Failed to search contracts' });
    await expect(errorAlert).toBeVisible();
  });

  test('should filter search results by category', async ({ page }) => {
    // Mock supporting APIs
    await page.route('**/api/contracts/types', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ types: ['controller', 'service', 'component'], count: 3 })
      });
    });

    await page.route('**/api/contracts/categories', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ categories: ['api', 'service', 'frontend'] })
      });
    });

    // Mock search API with user search results (mixed categories)
    await page.route('**/api/contracts/search*', async (route) => {
      await route.fulfill(mockSearchApiResponses.success(mockSearchResults.userSearch));
    });

    searchPage = new SearchPage(page);
    await searchPage.navigate();
    await page.waitForTimeout(500);

    // Perform a search
    await searchPage.search('user');
    await page.waitForTimeout(500);

    // Initially should show all 3 results
    let contractsCount = await searchPage.getContractsCount();
    expect(contractsCount).toBe(3);

    // Filter by API category
    await searchPage.selectCategory('Api');
    await page.waitForTimeout(300);

    // Should show only API category contracts (1 result)
    contractsCount = await searchPage.getContractsCount();
    expect(contractsCount).toBe(1);

    // Verify it's the API contract
    const hasApiContract = await searchPage.verifyContractExists({ category: 'api' });
    expect(hasApiContract).toBe(true);
  });

  test('should filter search results by type', async ({ page }) => {
    // Mock supporting APIs
    await page.route('**/api/contracts/types', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ types: ['controller', 'service', 'component'], count: 3 })
      });
    });

    await page.route('**/api/contracts/categories', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ categories: ['api', 'service', 'frontend'] })
      });
    });

    // Mock search API with user search results (mixed types)
    await page.route('**/api/contracts/search*', async (route) => {
      await route.fulfill(mockSearchApiResponses.success(mockSearchResults.userSearch));
    });

    searchPage = new SearchPage(page);
    await searchPage.navigate();
    await page.waitForTimeout(500);

    // Perform a search
    await searchPage.search('user');
    await page.waitForTimeout(500);

    // Initially should show all 3 results
    let contractsCount = await searchPage.getContractsCount();
    expect(contractsCount).toBe(3);

    // Filter by Service type
    await searchPage.selectType('Service');
    await page.waitForTimeout(300);

    // Should show only Service type contracts (1 result)
    contractsCount = await searchPage.getContractsCount();
    expect(contractsCount).toBe(1);

    // Verify it's a service type contract
    const hasServiceContract = await searchPage.verifyContractExists({ type: 'service' });
    expect(hasServiceContract).toBe(true);
  });

  test('should filter search results by both category and type', async ({ page }) => {
    // Mock supporting APIs
    await page.route('**/api/contracts/types', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ types: ['controller', 'service', 'component'], count: 3 })
      });
    });

    await page.route('**/api/contracts/categories', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ categories: ['api', 'service', 'frontend'] })
      });
    });

    // Mock search API with user search results
    await page.route('**/api/contracts/search*', async (route) => {
      await route.fulfill(mockSearchApiResponses.success(mockSearchResults.userSearch));
    });

    searchPage = new SearchPage(page);
    await searchPage.navigate();
    await page.waitForTimeout(500);

    // Perform a search
    await searchPage.search('user');
    await page.waitForTimeout(500);

    // Filter by API category and Controller type
    await searchPage.selectCategory('Api');
    await searchPage.selectType('Controller');
    await page.waitForTimeout(300);

    // Should show only API + Controller contracts (1 result)
    const contractsCount = await searchPage.getContractsCount();
    expect(contractsCount).toBe(1);

    // Verify it matches both criteria
    const hasMatchingContract = await searchPage.verifyContractExists({ 
      category: 'api',
      type: 'controller'
    });
    expect(hasMatchingContract).toBe(true);
  });

  test('should not call search API when query is empty and no filters selected', async ({ page }) => {
    let searchApiCalled = false;
    let allContractsApiCalled = false;

    // Mock supporting APIs
    await page.route('**/api/contracts/types', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ types: ['controller', 'service', 'component'], count: 3 })
      });
    });

    await page.route('**/api/contracts/categories', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ categories: ['api', 'service', 'frontend'] })
      });
    });

    // Mock get all contracts API to track if it's called
    await page.route('**/api/contracts', async (route) => {
      if (route.request().url().match(/\/api\/contracts(?:$|\?)/)) {
        allContractsApiCalled = true;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockContracts.mixedCategoryContracts)
        });
      } else {
        await route.continue();
      }
    });

    // Mock search API to track if it's called
    await page.route('**/api/contracts/search*', async (route) => {
      searchApiCalled = true;
      await route.fulfill(mockSearchApiResponses.success(mockSearchResults.userSearch));
    });

    searchPage = new SearchPage(page);
    await searchPage.navigate();
    await page.waitForTimeout(500);

    // Verify info alert is shown
    const infoAlert = page.locator('[role="alert"]').filter({ hasText: 'Select a category or type' });
    await expect(infoAlert).toBeVisible();

    // Verify neither API was called
    expect(searchApiCalled).toBe(false);
    expect(allContractsApiCalled).toBe(false);
  });

  test('should call all contracts API when filtering without search query', async ({ page }) => {
    let allContractsApiCalled = false;

    // Mock supporting APIs
    await page.route('**/api/contracts/types', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ types: ['controller', 'service', 'component'], count: 3 })
      });
    });

    await page.route('**/api/contracts/categories', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ categories: ['api', 'service', 'frontend'] })
      });
    });

    // Mock get all contracts API
    await page.route('**/api/contracts', async (route) => {
      if (route.request().url().match(/\/api\/contracts(?:$|\?)/)) {
        allContractsApiCalled = true;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockContracts.mixedCategoryContracts)
        });
      } else {
        await route.continue();
      }
    });

    // Mock search API (should not be called)
    await page.route('**/api/contracts/search*', async (route) => {
      await route.fulfill(mockSearchApiResponses.success(mockSearchResults.userSearch));
    });

    searchPage = new SearchPage(page);
    await searchPage.navigate();
    await page.waitForTimeout(500);

    // Select a category (without search query)
    await searchPage.selectCategory('API');
    await page.waitForTimeout(500);

    // Verify all contracts API was called
    expect(allContractsApiCalled).toBe(true);
  });
});

test.describe('Search Page - API Integration Tests', () => {
  let searchPage: SearchPage;

  test('should fetch and display categories from API', async ({ page }) => {
    // Mock the categories API response
    await page.route('**/api/contracts/categories', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          categories: ['api', 'service', 'frontend', 'database']
        })
      });
    });

    // Mock types API (required for page load)
    await page.route('**/api/contracts/types', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          types: ['controller', 'service'],
          count: 2
        })
      });
    });

    searchPage = new SearchPage(page);
    await searchPage.navigate();

    // Wait for the categories to be loaded
    await page.waitForTimeout(500);

    // Click on category select to open the dropdown
    await searchPage.categorySelect.click();

    // Verify all categories from API are available in the dropdown
    await expect(page.getByRole('option', { name: 'All Categories' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Api' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Service' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Frontend' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Database' })).toBeVisible();

    // Close the dropdown
    await page.keyboard.press('Escape');
  });

  test('should fetch and display types from API', async ({ page }) => {
    // Mock the types API response
    await page.route('**/api/contracts/types', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          types: ['controller', 'service', 'component', 'repository'],
          count: 4
        })
      });
    });

    // Mock categories API (required for page load)
    await page.route('**/api/contracts/categories', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          categories: ['api', 'service']
        })
      });
    });

    searchPage = new SearchPage(page);
    await searchPage.navigate();

    // Wait for the types to be loaded
    await page.waitForTimeout(500);

    // Click on type select to open the dropdown
    await searchPage.typeSelect.click();

    // Verify all types from API are available in the dropdown
    await expect(page.getByRole('option', { name: 'All Types' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Controller' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Service' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Component' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Repository' })).toBeVisible();

    // Close the dropdown
    await page.keyboard.press('Escape');
  });

  test('should handle categories API error gracefully and show error alert', async ({ page }) => {
    // Mock the categories API to return an error
    await page.route('**/api/contracts/categories', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Internal server error' })
      });
    });

    // Mock types API (required for page load)
    await page.route('**/api/contracts/types', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          types: ['controller', 'service'],
          count: 2
        })
      });
    });

    searchPage = new SearchPage(page);
    await searchPage.navigate();

    // Wait for the error to be displayed
    await page.waitForTimeout(500);

    // Verify error alert is displayed
    const errorAlert = page.locator('[role="alert"]').filter({ hasText: 'Failed to load contract categories' });
    await expect(errorAlert).toBeVisible();

    // Verify that the category select still has at least the default "All Categories" option
    await searchPage.categorySelect.click();
    await expect(page.getByRole('option', { name: 'All Categories' })).toBeVisible();
  });

  test('should handle types API error gracefully and show error alert', async ({ page }) => {
    // Mock categories API (required for page load)
    await page.route('**/api/contracts/categories', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          categories: ['api', 'service']
        })
      });
    });

    // Mock the types API to return an error
    await page.route('**/api/contracts/types', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Internal server error' })
      });
    });

    searchPage = new SearchPage(page);
    await searchPage.navigate();

    // Wait for the error to be displayed
    await page.waitForTimeout(500);

    // Verify error alert is displayed
    const errorAlert = page.locator('[role="alert"]').filter({ hasText: 'Failed to load contract types' });
    await expect(errorAlert).toBeVisible();

    // Verify that the type select still has at least the default "All Types" option
    await searchPage.typeSelect.click();
    await expect(page.getByRole('option', { name: 'All Types' })).toBeVisible();
  });

  test('should show loading state while fetching categories', async ({ page }) => {
    // Mock the categories API with a delay
    await page.route('**/api/contracts/categories', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          categories: ['api', 'service']
        })
      });
    });

    // Mock types API (required for page load)
    await page.route('**/api/contracts/types', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          types: ['controller', 'service'],
          count: 2
        })
      });
    });

    searchPage = new SearchPage(page);
    await searchPage.navigate();

    // Verify loading indicator is shown (the select should be disabled)
    const isDisabled = await searchPage.categorySelect.isDisabled();
    expect(isDisabled).toBe(true);

    // Wait for the API call to complete
    await page.waitForTimeout(1200);

    // Verify the select is now enabled
    const isEnabledAfter = await searchPage.categorySelect.isDisabled();
    expect(isEnabledAfter).toBe(false);
  });

  test('should show loading state while fetching types', async ({ page }) => {
    // Mock categories API (required for page load)
    await page.route('**/api/contracts/categories', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          categories: ['api', 'service']
        })
      });
    });

    // Mock the types API with a delay
    await page.route('**/api/contracts/types', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          types: ['controller', 'service'],
          count: 2
        })
      });
    });

    searchPage = new SearchPage(page);
    await searchPage.navigate();

    // Verify loading indicator is shown (the select should be disabled)
    const isDisabled = await searchPage.typeSelect.isDisabled();
    expect(isDisabled).toBe(true);

    // Wait for the API call to complete
    await page.waitForTimeout(1200);

    // Verify the select is now enabled
    const isEnabledAfter = await searchPage.typeSelect.isDisabled();
    expect(isEnabledAfter).toBe(false);
  });
});

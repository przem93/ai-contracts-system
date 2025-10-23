import { test, expect } from '@playwright/test';

/**
 * Simple health check test to verify the application is accessible
 * This test should run first to ensure the environment is set up correctly
 */
test.describe('Health Check', () => {
  test('should be able to access the application', async ({ page }) => {
    // Navigate to the base URL
    const response = await page.goto('/');
    
    // Verify we got a successful response
    expect(response?.status()).toBeLessThan(400);
    
    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');
    
    // Verify we have some content (not a blank page)
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
    expect(bodyText?.length).toBeGreaterThan(0);
    
    // Log the page title for debugging
    const title = await page.title();
    console.log('Page title:', title);
    
    // Log if we can find the root React element
    const rootElement = await page.locator('#root').count();
    console.log('Root element found:', rootElement > 0);
  });
});

import { Locator, expect } from '@playwright/test';

/**
 * Component class for the loading spinner
 * Provides methods to interact with and wait for loading states
 */
export class LoadingSpinner {
  readonly spinner: Locator;

  constructor(spinnerLocator: Locator) {
    this.spinner = spinnerLocator;
  }

  /**
   * Check if loading spinner is visible
   */
  async isVisible(): Promise<boolean> {
    try {
      return await this.spinner.isVisible();
    } catch {
      return false;
    }
  }

  /**
   * Wait for loading to complete (spinner to disappear)
   */
  async waitForLoadingToComplete(timeout: number = 10000) {
    await this.spinner.waitFor({ state: 'hidden', timeout });
  }

  /**
   * Wait for loading to start (spinner to appear)
   */
  async waitForLoadingToStart(timeout: number = 5000) {
    await this.spinner.waitFor({ state: 'visible', timeout });
  }

  /**
   * Verify spinner is visible
   */
  async verifyIsVisible() {
    await expect(this.spinner).toBeVisible();
  }

  /**
   * Verify spinner is hidden
   */
  async verifyIsHidden() {
    await expect(this.spinner).toBeHidden();
  }
}

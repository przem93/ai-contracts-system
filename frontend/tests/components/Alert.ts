import { Locator, expect } from '@playwright/test';

/**
 * Component class for MUI Alert components
 * Provides methods to interact with and verify alert messages
 */
export class Alert {
  readonly alert: Locator;

  constructor(alertLocator: Locator) {
    this.alert = alertLocator;
  }

  /**
   * Check if alert is visible
   */
  async isVisible(): Promise<boolean> {
    try {
      return await this.alert.isVisible();
    } catch {
      return false;
    }
  }

  /**
   * Get the alert text content
   */
  async getText(): Promise<string> {
    return await this.alert.textContent() || '';
  }

  /**
   * Verify alert is visible
   */
  async verifyIsVisible() {
    await expect(this.alert).toBeVisible();
  }

  /**
   * Verify alert has specific text
   */
  async verifyText(expectedText: string) {
    await expect(this.alert).toContainText(expectedText);
  }

  /**
   * Verify alert severity (by checking icon or styling)
   */
  async verifySeverity(severity: 'error' | 'warning' | 'info' | 'success') {
    const severityIcon = this.alert.locator(`[class*="MuiAlert-icon${severity}"]`);
    await expect(severityIcon).toBeVisible();
  }

  /**
   * Wait for alert to appear
   */
  async waitForAlert(timeout: number = 5000) {
    await this.alert.waitFor({ state: 'visible', timeout });
  }
}

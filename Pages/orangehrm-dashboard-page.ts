import { type Page, expect } from '@playwright/test';

export class OrangeHRMDashboardPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async assertOnDashboard() {
    // The dashboard header text is "Dashboard"
    await expect(this.page.locator('h6.oxd-text.oxd-text--h6.oxd-topbar-header-breadcrumb-module')).toHaveText('Dashboard');
    // Optionally, check the URL
    await expect(this.page).toHaveURL(/dashboard/);
  }
} 
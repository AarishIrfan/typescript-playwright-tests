import { test } from '@playwright/test';
import { OrangeHRMLoginPage } from '../Pages/orangehrm-login-page';
import { OrangeHRMDashboardPage } from '../Pages/orangehrm-dashboard-page';

const VALID_USERNAME = 'Admin';
const VALID_PASSWORD = 'admin123';

test.describe('OrangeHRM Login E2E', () => {
  let loginPage: OrangeHRMLoginPage;
  let dashboardPage: OrangeHRMDashboardPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new OrangeHRMLoginPage(page);
    dashboardPage = new OrangeHRMDashboardPage(page);
    await loginPage.goto();
  });

  test('should login successfully and show dashboard', async () => {
    await loginPage.login(VALID_USERNAME, VALID_PASSWORD);
    await dashboardPage.assertOnDashboard();
  });

  test('should show error on invalid credentials', async () => {
    await loginPage.login('wronguser', 'wrongpass');
    await loginPage.assertErrorMessage('Invalid credentials');
  });
});
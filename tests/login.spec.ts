import { test, expect } from '@playwright/test';

const BASE_URL = 'https://practice.expandtesting.com/login';
const VALID_USERNAME = 'practice';
const VALID_PASSWORD = 'SuperSecretPassword!';
test.skip(({ browserName }) => browserName === 'firefox', 'Skip all tests in Firefox');

test.beforeEach(async ({ page }, testInfo) => {
  await page.goto(BASE_URL);
  console.log(`Running: ${testInfo.title}`);
});

test.afterEach(async ({ page }, testInfo) => {
  console.log(`Finished: ${testInfo.title} with status ${testInfo.status}`);
});

test.describe('Login Page', () => {
  test('should show error on invalid username', async ({ page }) => {
    await test.step('Arrange', async () => {
      await page.fill('#username', 'wronguser');
      await page.fill('#password', VALID_PASSWORD);
    });
    await test.step('Act', async () => {
      await page.click('button[type="submit"]');
    });
    await test.step('Assert', async () => {
      await expect(page.locator('#flash')).toContainText('Your username is invalid!');
    });
  });

  test('should show error on invalid password', async ({ page }) => {
    await test.step('Arrange', async () => {
      await page.fill('#username', VALID_USERNAME);
      await page.fill('#password', 'WrongPassword');
    });
    await test.step('Act', async () => {
      await page.click('button[type="submit"]');
    });
    await test.step('Assert', async () => {
      await expect(page.locator('#flash')).toContainText('Your password is invalid!');
    });
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    await test.step('Arrange', async () => {
      await page.fill('#username', VALID_USERNAME);
      await page.fill('#password', VALID_PASSWORD);
    });
    await test.step('Act', async () => {
      await page.click('button[type="submit"]');
    });
    await test.step('Assert', async () => {
      await expect(page.locator('#flash')).toContainText('You logged into a secure area!');
      await expect(page).toHaveURL(/secure/);
    });
  });
});
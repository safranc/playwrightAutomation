const { test, expect } = require('@playwright/test');
const { login, logout } = require('../../function/helpers');

test('logs in, adds all inventory items, resets app state, and verifies cart is cleared', async ({ page }) => {
  const username = 'standard_user';
  await login(page, username);

  const items = page.locator('.inventory_item');
  const count = await items.count();
  expect(count).toBeGreaterThan(0);

  for (let i = 0; i < count; i++) {
    await items.nth(i).locator('button').click();
  }

  for (let i = 0; i < count; i++) {
    await expect(items.nth(i).locator('button', { hasText: /remove/i })).toBeVisible();
  }

  await page.click('#react-burger-menu-btn');
  await page.click('#reset_sidebar_link');

  await page.reload();

  const afterCount = await items.count();
  for (let i = 0; i < afterCount; i++) {
    await expect(items.nth(i).locator('button', { hasText: /add to cart/i })).toBeVisible();
    await expect(items.nth(i).locator('button', { hasText: /remove/i })).toHaveCount(0);
  }

  await logout(page);
});

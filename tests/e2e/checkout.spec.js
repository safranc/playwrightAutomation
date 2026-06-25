const { test, expect } = require('@playwright/test');
const { login, logout } = require('./helpers');
const checkoutData = require('../../../sathcypress/env.json');

test('logs in, adds first two items, checks out, and validates summary', async ({ page }) => {
  const checkoutUser = checkoutData.checkoutUsers.find(u => u.id === 'standard_user');
  if (!checkoutUser) throw new Error('standard_user not found in env.json');

  await login(page, checkoutUser.id);

  const itemsLocator = page.locator('.inventory_item');
  const itemsCount = await itemsLocator.count();
  expect(itemsCount).toBeGreaterThanOrEqual(2);

  await itemsLocator.nth(0).locator('button').click();
  await itemsLocator.nth(1).locator('button').click();

  await page.click('.shopping_cart_link');
  await expect(page).toHaveURL(/cart.html/);

  await page.click('[data-test="checkout"]');
  await expect(page).toHaveURL(/checkout-step-one.html/);

  await page.fill('[data-test="firstName"]', checkoutUser.firstName);
  await page.fill('[data-test="lastName"]', checkoutUser.lastName);
  await page.fill('[data-test="postalCode"]', checkoutUser.postalCode);
  await page.click('[data-test="continue"]');

  await expect(page).toHaveURL(/checkout-step-two.html/);
  await expect(page.locator('text=Payment Information')).toBeVisible();
  await expect(page.locator('text=Shipping Information')).toBeVisible();
  await expect(page.locator('text=Price Total')).toBeVisible();

  await page.click('[data-test="finish"]');
  await expect(page).toHaveURL(/checkout-complete.html/);
  await expect(page.locator('img[alt="Pony Express"]')).toBeVisible();
  await expect(page.locator('text=THANK YOU FOR YOUR ORDER')).toBeVisible();

  await logout(page);
});

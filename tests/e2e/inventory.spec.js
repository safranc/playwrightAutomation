const { test, expect } = require('@playwright/test');
const { login, logout } = require('../../function/helpers');

function isSortedAsc(arr) { return arr.every((v,i) => i === 0 || arr[i-1] <= v); }
function isSortedDesc(arr) { return arr.every((v,i) => i === 0 || arr[i-1] >= v); }

test('verifies inventory sorting for names and prices', async ({ page }) => {
  await login(page, 'standard_user');
  await expect(page).toHaveURL(/inventory.html/);

  const sort = page.locator('.product_sort_container');
  await expect(sort).toBeVisible();

  // Name A-Z
  await sort.selectOption({ label: 'Name (A to Z)' });
  const namesA = await page.$$eval('.inventory_item_name', items => items.map(i => i.innerText.trim()));
  expect(isSortedAsc(namesA)).toBeTruthy();

  // Name Z-A
  await sort.selectOption({ label: 'Name (Z to A)' });
  const namesZ = await page.$$eval('.inventory_item_name', items => items.map(i => i.innerText.trim()));
  expect(isSortedDesc(namesZ)).toBeTruthy();

  // Price low to high
  await sort.selectOption({ label: 'Price (low to high)' });
  const pricesLow = await page.$$eval('.inventory_item_price', items => items.map(i => parseFloat(i.innerText.replace('$',''))));
  expect(isSortedAsc(pricesLow)).toBeTruthy();

  // Price high to low
  await sort.selectOption({ label: 'Price (high to low)' });
  const pricesHigh = await page.$$eval('.inventory_item_price', items => items.map(i => parseFloat(i.innerText.replace('$',''))));
  expect(isSortedDesc(pricesHigh)).toBeTruthy();

  await logout(page);
});

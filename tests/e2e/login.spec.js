const { test, expect } = require('@playwright/test');
const { login } = require('../../function/helpers');

test.describe('Sauce Demo - Login tests', () => {
  const { readLocalCreds } = require('../../function/helpers');
  const local = readLocalCreds();
  const usersEnv = process.env.PLAYWRIGHT_USERS || process.env.USERS || local.users || 'standard_user,locked_out_user';
  const users = usersEnv.split(',').map(u => u.trim()).filter(Boolean);

  for (const user of users) {
    test(`login attempt for ${user}`, async ({ page }) => {
      await login(page, user);
      if (user === 'locked_out_user') {
        await expect(page.locator('[data-test="error"]')).toBeVisible({ timeout: 5000 });
      } else {
        await expect(page).toHaveURL(/inventory.html/, { timeout: 10000 });
      }
    });
  }
});

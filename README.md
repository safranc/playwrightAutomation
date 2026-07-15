# Playwright E2E Tests (saucedemo)

This folder contains Playwright end-to-end tests for https://www.saucedemo.com.

## What is included
- `tests/e2e/login.spec.js` — login validation for configured users (including locked_out_user).
- `tests/e2e/inventory.spec.js` — asserts inventory sorting (name and price).
- `tests/e2e/checkout.spec.js` — full checkout flow using test data from `sathcypress/env.json`.
- `tests/e2e/reset.spec.js` — add items, reset app state, and verify cart cleared.
- `tests/e2e/helpers.js` — shared helpers (login/logout) and reads local credentials.
- `credentials.json` — local credentials (users and password) used by tests when env vars are not set.

## Where credentials come from
The tests read credentials in this order of precedence:
1. Environment variables: `PLAYWRIGHT_USERS` (comma-separated) and `PLAYWRIGHT_PASSWORD`.
2. `playwright/credentials.json` (fields: `users`, `password`).
3. Defaults: `standard_user,locked_out_user` and `secret_sauce`.

Checkout user details (firstName/lastName/postalCode) are read from `sathcypress/env.json` in the workspace.

## Run tests (terminal)
Open a terminal and run from the `playwright` folder.

PowerShell examples:

```powershell
cd playwright
# install dependencies (if not already installed)
npm ci

# run all e2e tests
npx playwright test tests/e2e

# run a single test file
npx playwright test tests/e2e/checkout.spec.js

# run with headed browsers (visible)
npx playwright test --headed

# run with Playwright Inspector (interactive debugging)
$env:PWDEBUG=1
npx playwright test

# run with custom users/password
$env:PLAYWRIGHT_USERS='standard_user'
$env:PLAYWRIGHT_PASSWORD='secret_sauce'
npx playwright test tests/e2e/login.spec.js

# show the HTML report (after a run)
npx playwright show-report
```

Notes:
- `--headed` shows the browser windows.
- Setting `PWDEBUG=1` (or ` $env:PWDEBUG=1` on PowerShell) launches the Playwright inspector for easier debugging.

## Run tests in an IDE / local runner
- Use the Playwright extension for VS Code or run tests from the VS Code test explorer (it will detect Playwright tests if configured).
- In VS Code you can run individual tests, run with the inspector, or run in headed mode via run configurations that execute the same `npx playwright test` commands.

## Test behavior and stability
- Tests avoid external network dependencies where possible (many assertions use local page content or the live saucedemo site).
- If the network environment blocks `https://www.saucedemo.com`, use the `PWDEBUG` inspector and run headed to interactively diagnose failures.

## Recommended cleanup
- `node_modules/` is ignored in `.gitignore`. Use `npm ci` to restore dependencies locally after cloning.

## Troubleshooting
- If a test fails because of credentials, ensure `PLAYWRIGHT_PASSWORD` or `playwright/credentials.json` are correct.
- To re-run a flaky test with videos/traces enabled, add Playwright configuration flags in `playwright.config.js` or run the test with `--trace on`.

If you want, I can add a `run-tests.ps1` helper script or a GitHub Actions workflow to run these tests in CI.

## CI Integration

The Playwright test suite is executed automatically via GitHub Actions on every push to the repository. The workflow file is located at `.github/workflows/playwright.yml` and runs `npx playwright test` to execute the tests and publish the HTML report.

In CI the typical steps are:

1. Checkout the repository
2. Install dependencies (`npm ci`)
3. Run the Playwright tests (`npx playwright test`)
4. Upload the Playwright report as a workflow artifact

If you prefer, I can also add a short `run-ci.ps1` helper or update the workflow to include matrix browsers or artifact retention settings.

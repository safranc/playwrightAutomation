const path = require('path');
const fs = require('fs');
const BASE = 'https://www.saucedemo.com';

function readLocalCreds() {
  try {
    const credPath = path.resolve(__dirname, '..', 'credentials.json');
    const raw = fs.readFileSync(credPath, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    return { users: 'standard_user,locked_out_user', password: 'secret_sauce' };
  }
}

async function login(page, username) {
  const local = readLocalCreds();
  const password = process.env.PLAYWRIGHT_PASSWORD || process.env.PASSWORD || local.password;
  await page.goto(BASE);
  await page.fill('#user-name', username);
  await page.fill('#password', password);
  await page.click('#login-button');
}

async function logout(page) {
  await page.click('#react-burger-menu-btn');
  await page.click('#logout_sidebar_link');
  await page.waitForSelector('#login-button');
}

module.exports = { login, logout, readLocalCreds };

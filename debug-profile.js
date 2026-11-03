const { chromium } = require('@playwright/test');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const BASE_URL = 'https://d333afta2q6llv.cloudfront.net';
  
  // Логинимся заново
  const context = await browser.newContext();
  const page = await context.newPage();
  
  await page.goto(`${BASE_URL}/sign-in`);
  await page.getByRole('textbox', { name: 'Email' }).fill('dtimokhin+aiorg01@aexsoft.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('7952Qaz!');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL(url => !url.toString().includes('sign-in'), { timeout: 20000 });
  
  console.log('Logged in, URL:', page.url());
  
  // Сохраняем storageState
  const state = await context.storageState();
  fs.writeFileSync('tests/.auth/owner-storage.json', JSON.stringify(state, null, 2));
  
  // НЕ закрывая контекст — сразу проверяем logout
  console.log('\n=== Проверка logout в том же контексте ===');
  
  // Ищем profile button
  const headerButtons = page.locator('header [role="button"]');
  const headerCount = await headerButtons.count();
  console.log('Header buttons:', headerCount);
  
  // Ищем avatar
  const avatarBtns = page.locator('[role="button"]:has(svg), [role="button"]:has(img), [role="button"]:has(.MuiAvatar-root)');
  const avatarCount = await avatarBtns.count();
  console.log('Avatar buttons:', avatarCount);
  for (let i = 0; i < avatarCount; i++) {
    const btn = avatarBtns.nth(i);
    console.log(`  Avatar ${i}: visible=${await btn.isVisible().catch(() => false)}`);
  }
  
  // Ищем все кнопки на странице
  const allButtons = page.locator('button');
  const allCount = await allButtons.count();
  console.log('All buttons on page:', allCount);
  for (let i = 0; i < Math.min(allCount, 30); i++) {
    const btn = allButtons.nth(i);
    const text = (await btn.textContent().catch(() => '')).trim();
    const visible = await btn.isVisible().catch(() => false);
    const role = await btn.getAttribute('role').catch(() => '');
    if (visible && text) {
      console.log(`  Button ${i}: "${text.substring(0,40)}" role="${role}"`);
    }
  }
  
  // Ищем menuitem
  const menuitems = page.locator('[role="menuitem"]');
  const menuCount = await menuitems.count();
  console.log('Menu items:', menuCount);
  for (let i = 0; i < menuCount; i++) {
    const mi = menuitems.nth(i);
    const text = await mi.textContent().catch(() => '');
    const visible = await mi.isVisible().catch(() => false);
    if (visible) {
      console.log(`  Menu ${i}: "${text?.substring(0,40)}" visible=${visible}`);
    }
  }
  
  // Пробуем logout через getByRole
  const logoutMenu = page.getByRole('menuitem', { name: 'Log Out' });
  console.log('\nLog Out menuitem visible:', await logoutMenu.isVisible().catch(() => false));
  
  if (await logoutMenu.isVisible().catch(() => false)) {
    await logoutMenu.click();
    await page.waitForURL(url => url.includes('sign-in'), { timeout: 10000 });
    console.log('✅ Logout successful');
  } else {
    // Пробуем найти через текст
    const anyLogout = page.getByText('Log Out');
    const logoutCount = await anyLogout.count();
    console.log('Elements with "Log Out":', logoutCount);
    
    if (logoutCount > 0) {
      await anyLogout.first().click();
      console.log('Clicked Log Out via getByText');
    }
    
    // Скриншот
    await page.screenshot({ path: 'test-results/debug-profile3.png', fullPage: true });
    console.log('Screenshot saved');
  }
  
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });

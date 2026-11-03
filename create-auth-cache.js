const { chromium } = require('@playwright/test');
const fs = require('fs');

const ROLES = {
  owner: { email: 'dtimokhin+aiorg01@aexsoft.com', password: '7952Qaz!' },
  sysadmin: { email: 'aextester+sysadmin@gmail.com', password: 'Test123456' },
  coach: { email: 'dtimokhin+coach@aexsoft.com', password: '7952Qaz!' },
  parent: { email: 'dtimokhin+parent@aexsoft.com', password: '7952Qaz!' },
  athlete: { email: 'dtimokhin+athlete@aexsoft.com', password: '7952Qaz!' },
};

(async () => {
  const browser = await chromium.launch();
  const BASE_URL = 'https://d333afta2q6llv.cloudfront.net';

  for (const [role, creds] of Object.entries(ROLES)) {
    console.log(`\n=== ${role} ===`);
    const storagePath = `tests/.auth/${role}.json`;

    try {
      const context = await browser.newContext();
      const page = await context.newPage();

      await page.goto(`${BASE_URL}/sign-in`);
      await page.getByRole('textbox', { name: 'Email' }).fill(creds.email);
      await page.getByRole('textbox', { name: 'Password' }).fill(creds.password);
      await page.getByRole('button', { name: 'Sign In' }).click();
      await page.waitForURL(url => !url.toString().includes('sign-in'), { timeout: 20000 });

      const state = await context.storageState();
      fs.mkdirSync('tests/.auth', { recursive: true });
      fs.writeFileSync(storagePath, JSON.stringify(state));

      const token = state.origins?.[0]?.localStorage?.find(e => e.name.includes('auth-token'));
      if (token) {
        const payload = JSON.parse(atob(token.value.split('.')[1]));
        const exp = new Date(payload.exp * 1000);
        console.log(`  ✅ Saved, expires: ${exp.toISOString()}`);
      }
      await context.close();
    } catch (e) {
      console.log(`  ❌ Error: ${e.message.substring(0, 80)}`);
    }
  }

  await browser.close();
  console.log('\nDone.');
})().catch(e => { console.error(e); process.exit(1); });

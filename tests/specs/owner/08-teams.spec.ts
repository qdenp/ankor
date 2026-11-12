import { test, expect } from '../../fixtures';
import { TeamPage } from '../../pages/team-page';
import { TIMEOUTS } from '../../config';

/**
 * 08 — Teams (пункт меню Teams).
 * Owner tests run sequentially within the role.
 */
test.describe('Owner Team Tests', () => {
  test.describe.configure({ mode: 'serial' });

  // 71851: Create team
  test('should create new team', async ({ loginAs, page }) => {
    const teamPage = new TeamPage(page);

    await loginAs('owner');

    await teamPage.goto();

    // Создаём команду
    const teamName = `Test Team ${Date.now()}`;
    await teamPage.createTeam({
      name: teamName,
      active: true,
    });

    // Проверяем, что команда создалась и отображается в таблице
    await teamPage.search(teamName);
    await expect(teamPage.getTeamRow(teamName)).toBeVisible({ timeout: TIMEOUTS.medium });
  });
});

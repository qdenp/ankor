import { test, expect } from '../../fixtures';
import { HomePage } from '../../pages/home-page';

/**
 * @TC-71818 Home page (Coach Summary)
 *
 * CSV Steps:
 * [step 1] Перейти на Home
 *   [step 1.1] exp отображается Coach Summary
 *   [step 1.2] exp Athletes: количество атлетов
 *   [step 1.3] exp Submitted Evaluations
 *   [step 1.4] exp Shared Plans
 *   [step 1.5] exp Assigned Drills
 */
test.describe('Coach Home Page Tests', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ loginAs }) => {
    await loginAs('coach');
  });

  test('should display Coach Summary dashboard on Home page', async ({ page }) => {
    const homePage = new HomePage(page);

    await homePage.goto();

    // [step 1] Coach Home page loaded
    await expect(homePage.coachWelcomeHeading, 'Coach welcome heading should be visible').toBeVisible();

    // [step 1.2-1.5] Team Snapshot metrics
    await expect(homePage.teamSnapshotHeading, 'Team Snapshot heading should be visible').toBeVisible();
    await expect(homePage.teamsMetric, 'Teams metric should be visible').toBeVisible();
    await expect(homePage.athletesMetric, 'Athletes metric should be visible').toBeVisible();
    await expect(homePage.evaluationsMetric, 'Evaluations metric should be visible').toBeVisible();
    await expect(homePage.practicePlansMetric, 'Practice plans metric should be visible').toBeVisible();
  });
});

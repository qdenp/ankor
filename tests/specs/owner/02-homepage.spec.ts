import { test, expect } from '../../fixtures';
import { HomePage } from '../../pages/home-page';

/**
 * @TC-71823 Home page (Owner/admin)
 *
 * CSV Steps:
 * [step 1] Перейти на Home (/)
 *   [step 1.1] exp Total Athletes: общее число активных атлетов в организации
 *   [step 1.2] exp Submitted Evaluations: общее число submitted evaluation reports
 *   [step 1.3] exp Shared Plans: число share-событий
 *   [step 1.4] exp Active Coaches: число активных коучей
 * [step 2] Проверить, что счётчики отражают всю организацию
 */
test.describe('Owner Home Page Tests', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ loginAs }) => {
    await loginAs('owner');
  });

  test('should display org-wide dashboard counters on Home page', async ({ page }) => {
    const homePage = new HomePage(page);

    await homePage.goto();

    // [step 1] Все 4 карточки видны
    await expect(homePage.totalAthletesCard, 'Total Athletes card should be visible').toBeVisible();
    await expect(homePage.submittedEvaluationsCard, 'Submitted Evaluations card should be visible').toBeVisible();
    await expect(homePage.sharedPlansCard, 'Shared Plans card should be visible').toBeVisible();
    await expect(homePage.activeCoachesCard, 'Active Coaches card should be visible').toBeVisible();
  });
});

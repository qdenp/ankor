import { test, expect } from '../../fixtures';
import { HomePage } from '../../pages/home-page';

/**
 * @TC-71822 Home page (Parent)
 *
 * CSV Steps:
 * [step 1] Перейти на home page
 *   [step 1.1] exp отображается Parent Summary
 *   [step 1.2] exp Athletes: количество атлетов
 *   [step 1.3] exp Submitted Evaluations
 *   [step 1.4] exp Shared Plans
 *   [step 1.5] exp Assigned Drills
 */
test.describe('Parent Home Page Tests', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ loginAs }) => {
    await loginAs('parent');
  });

  test('should display Parent Summary dashboard on Home page', async ({ page }) => {
    const homePage = new HomePage(page);

    await homePage.goto();

    // [step 1] Welcome back, Parent
    await expect(homePage.welcomeHeading, 'Parent welcome heading should be visible').toBeVisible();

    // [step 1.1] Today's Workout block — No Workout for Today or drills list
    await expect(homePage.todayWorkoutHeading, "Today's Workout heading should be visible").toBeVisible();

    // [step 1.2] Session Summary block — все карточки видны
    await expect(homePage.sessionSummaryHeading, 'Session Summary heading should be visible').toBeVisible();
    await expect(homePage.totalEvaluationsMetric, 'Total Evaluations metric should be visible').toBeVisible();
    await expect(homePage.sharedPlansMetric, 'Shared Plans metric should be visible').toBeVisible();
    await expect(homePage.assignedDrillsMetric, 'Assigned Drills metric should be visible').toBeVisible();
    await expect(homePage.lastEvaluationMetric, 'Last Evaluation metric should be visible').toBeVisible();
  });
});

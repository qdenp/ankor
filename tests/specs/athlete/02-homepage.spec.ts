import * as allure from 'allure-js-commons';
import { test, expect } from '../../fixtures';
import { HomePage } from '../../pages/home-page';

/**
 * @TC-71821 Home page (Athlete)
 *
 * CSV Steps:
 * [step 1] Перейти на home page
 *   [step 1.1] No Workout for Today во вкладке workout
 *   [step 1.2] Также есть элементы:
 *     - Submitted Evaluations: Total number of submitted evaluation reports
 *     - Assigned Plans: Total number of plans athlete invited to
 *     - Assigned Drills: Total number of unique drills mapped to Primary Development Focus skills
 *     - Last Evaluation: Date of most recent submitted evaluation
 */
test.describe('Athlete Home Page Tests', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ loginAs }) => {
    await loginAs('athlete');
  });

  test('should display Athlete Summary dashboard on Home page', async ({ page }) => {
    await allure.allureId('71821');
    const homePage = new HomePage(page);

    await homePage.goto();

    // [step 1] Welcome back, Athlete
    await expect(homePage.welcomeHeading, 'Athlete welcome heading should be visible').toBeVisible();

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

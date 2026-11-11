import { test, expect } from '../../fixtures';
import { SkillPage } from '../../pages/skill-page';
import { DrillPage } from '../../pages/drill-page';
import { EvaluationPage } from '../../pages/evaluation-page';
import { PlanPage } from '../../pages/plan-page';
import { HomePage } from '../../pages/home-page';
import { TIMEOUTS } from '../../config';

/**
 * @TC-71845 Permission (Athlete)
 *
 * CSV Steps:
 * [step 1] Skill / drill - view only
 * [step 2] Evaluation - view only
 * [step 3] Evaluation report - view only
 * [step 4] Plan - CRUD only own plan
 */
test.describe('Athlete Permission Tests', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ loginAs }) => {
    await loginAs('athlete');
  });

  test.skip(true, 'TODO - новая фича shared plans для атлетов');
  test('should have view-only access to Skills, Drills, Evaluations and view-only Evaluation Reports', async ({ page }) => {
    const homePage = new HomePage(page);
    const skillPage = new SkillPage(page);
    const drillPage = new DrillPage(page);
    const evaluationPage = new EvaluationPage(page);
    const planPage = new PlanPage(page);

    // [step 1] Skill / drill - view only
    await homePage.goToSkills();
    await expect(skillPage.heading, 'Skills heading should be visible').toBeVisible({ timeout: TIMEOUTS.long });
    await expect(skillPage.createSkillButton, 'Create Skill button should be hidden for athlete').toBeHidden({ timeout: TIMEOUTS.medium });

    await homePage.goToDrills();
    await expect(drillPage.heading, 'Drills heading should be visible').toBeVisible({ timeout: TIMEOUTS.long });
    await expect(drillPage.newDrillButton, 'Create drill button should be hidden for athlete').toBeHidden({ timeout: TIMEOUTS.medium });

    // [step 2] Evaluation - view only (sidebar link hidden for athlete)
    await expect(homePage.navEvaluations, 'Evaluation sidebar link should be hidden for athlete').toBeHidden({ timeout: TIMEOUTS.medium });

    // [step 3] Evaluation report - view only (sidebar link visible, Create hidden)
    await expect(homePage.navEvaluationReports, 'Evaluation Reports sidebar link should be visible for athlete').toBeVisible();
    await evaluationPage.gotoReports();
    await expect(evaluationPage.createButton, 'Create button should be hidden on Evaluation Reports page').toBeHidden({ timeout: TIMEOUTS.medium });

    // [step 4] Plan - CRUD only own plan
    await planPage.goto();

    // My Plans tab — visible, Create button visible
    await expect(planPage.myPlansTab, 'My Plans tab should be visible').toBeVisible();
    await expect(planPage.newPlanButton, 'Create Plan button should be visible for athlete').toBeVisible();

    // Invited tab — visible
    await planPage.goToInvited();
    await expect(planPage.invitedTab, 'Invited tab should be visible').toBeVisible();

    // Prebuilt tab — NOT visible for athlete
    await expect(planPage.prebuiltTab, 'Prebuilt tab should be hidden for athlete').toBeHidden({ timeout: TIMEOUTS.medium });

    // Org Plans tab — NOT visible (TC-72622)
    await expect(planPage.orgPlansTab, 'Org Plans tab should be hidden for athlete').toBeHidden({ timeout: TIMEOUTS.medium });
  });
});

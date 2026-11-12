import * as allure from 'allure-js-commons';
import { test, expect } from '../../fixtures';
import { SkillPage } from '../../pages/skill-page';
import { DrillPage } from '../../pages/drill-page';
import { AthletePage } from '../../pages/athlete-page';
import { ParentPage } from '../../pages/parent-page';
import { CoachPage } from '../../pages/coach-page';
import { TeamPage } from '../../pages/team-page';
import { EvaluationPage } from '../../pages/evaluation-page';
import { PlanPage } from '../../pages/plan-page';
import { HomePage } from '../../pages/home-page';
import { TIMEOUTS } from '../../config';

/**
 * @TC-71844 Permission (Coach)
 *
 * CSV Steps:
 * [step 1] Skill / drill - view only
 * [step 2] Scorecard Templates - view only
 * [step 3] Athlete - CRUD
 * [step 4] Parents - CRUD
 * [step 5] Coach - view only
 * [step 6] Team - CRUD
 * [step 7] Easy join - CRUD
 * [step 8] Evaluation - CRUD
 * [step 9] Evaluation report - see all organization report
 * [step 10] Plan - see my plan/invited/prebuilt
 */
test.describe('Coach Permission Tests', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ loginAs }) => {
    await loginAs('coach');
  });

  test('should have CRUD access to Athlete/Parent/Team/EasyJoin/Eval/Plan and view-only to Skill/Drill/Scorecard/Coach', async ({ page }) => {
    await allure.allureId('71844');
    const homePage = new HomePage(page);
    const skillPage = new SkillPage(page);
    const drillPage = new DrillPage(page);
    const athletePage = new AthletePage(page);
    const parentPage = new ParentPage(page);
    const coachPage = new CoachPage(page);
    const teamPage = new TeamPage(page);
    const evaluationPage = new EvaluationPage(page);
    const planPage = new PlanPage(page);

    // [step 1] Skill / drill - view only
    await homePage.goToSkills();
    await expect(skillPage.heading, 'Skills heading should be visible').toBeVisible({ timeout: TIMEOUTS.long });
    await expect(skillPage.createSkillButton, 'Create Skill button should be hidden for coach').toBeHidden();

    await homePage.goToDrills();
    await expect(drillPage.heading, 'Drills heading should be visible').toBeVisible({ timeout: TIMEOUTS.long });
    await expect(drillPage.newDrillButton, 'Create drill button should be hidden for coach').toBeHidden();

    // [step 2] Scorecard Templates - view only (sidebar link hidden for coach)
    await expect(homePage.navScorecards, 'Score Cards Template sidebar link should be hidden for coach').toBeHidden();

    // [step 3] Athlete - CRUD (Create button visible)
    await athletePage.goto();
    await expect(athletePage.heading, 'Athletes heading should be visible').toBeVisible({ timeout: TIMEOUTS.long });
    await expect(athletePage.newAthleteButton, 'New Athlete button should be visible for coach').toBeVisible();

    // [step 4] Parents - CRUD (Create button visible)
    await parentPage.goto();
    await expect(parentPage.heading, 'Parents heading should be visible').toBeVisible({ timeout: TIMEOUTS.long });
    await expect(parentPage.newParentButton, 'New Parent button should be visible for coach').toBeVisible();

    // [step 5] Coach - view only (no Create button)
    await coachPage.goto();
    await expect(coachPage.heading, 'Coaches heading should be visible').toBeVisible({ timeout: TIMEOUTS.long });
    await expect(coachPage.newCoachButton, 'New Coach button should be hidden for coach').toBeHidden();

    // [step 6] Team - CRUD (Create button visible)
    await teamPage.goto();
    await expect(teamPage.heading, 'Teams heading should be visible').toBeVisible({ timeout: TIMEOUTS.long });
    await expect(teamPage.newTeamButton, 'New Team button should be visible for coach').toBeVisible();

    // [step 7] Easy join - CRUD (page loads)
    await homePage.goToEasyJoin();
    await expect(homePage.pageHeading, 'Easy Join page should load').toBeVisible({ timeout: TIMEOUTS.long });

    // [step 8] Evaluation - CRUD (Create button visible)
    await evaluationPage.goto();
    await expect(evaluationPage.newEvaluationButton, 'Create evaluation button should be visible for coach').toBeVisible();

    // [step 9] Evaluation report - see all organization reports (sidebar visible)
    await expect(homePage.navEvaluationReports, 'Evaluation Reports sidebar link should be visible for coach').toBeVisible();

    // [step 10] Plan - see my plan/invited/prebuilt
    await planPage.goto();
    await expect(planPage.myPlansTab, 'My Plans tab should be visible').toBeVisible();
    await expect(planPage.newPlanButton, 'Create Plan button should be visible for coach').toBeVisible();

    await planPage.goToInvited();
    await expect(planPage.invitedTab, 'Invited tab should be visible').toBeVisible();

    await planPage.goToPrebuilt();
    await expect(planPage.prebuiltTab, 'Prebuilt tab should be visible for coach').toBeVisible();

    // Org Plans tab — NOT visible for coach (TC-72623)
    await expect(planPage.orgPlansTab, 'Org Plans tab should be hidden for coach').toBeHidden();
  });
});

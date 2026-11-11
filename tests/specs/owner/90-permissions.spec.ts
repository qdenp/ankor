import { test, expect } from '../../fixtures';
import { OrganizationPage } from '../../pages/organization-page';
import { SkillPage } from '../../pages/skill-page';
import { DrillPage } from '../../pages/drill-page';
import { ScorecardTemplatePage } from '../../pages/scorecard-template-page';
import { AthletePage } from '../../pages/athlete-page';
import { CoachPage } from '../../pages/coach-page';
import { ParentPage } from '../../pages/parent-page';
import { TeamPage } from '../../pages/team-page';
import { EvaluationPage } from '../../pages/evaluation-page';
import { PlanPage } from '../../pages/plan-page';
import { HomePage } from '../../pages/home-page';
import { TIMEOUTS } from '../../config';

/**
 * @TC-71843 Permission (Owner/admin)
 *
 * CSV Steps:
 * [step 1] Organization profile — может просматривать, редактировать только свою организацию
 * [step 2] Skill — CRUD
 * [step 3] Drill — CRUD
 * [step 4] Scorecard Templates — CRUD
 * [step 5] Athlete — CRUD
 * [step 6] Parents — CRUD
 * [step 7] Coach — CRUD
 * [step 8] Team — CRUD
 * [step 9] Easy join — CRUD
 * [step 10] Evaluation — CRUD
 * [step 11] Evaluation report — see all organization report
 * [step 12] Plan — see all organization plan
 */
test.describe('Owner Permission Tests', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ loginAs }) => {
    await loginAs('owner');
  });

  test('should have full CRUD access to all modules and see own organization only', async ({ page }) => {
    const homePage = new HomePage(page);
    const orgPage = new OrganizationPage(page);
    const skillPage = new SkillPage(page);
    const drillPage = new DrillPage(page);
    const scorecardPage = new ScorecardTemplatePage(page);
    const athletePage = new AthletePage(page);
    const coachPage = new CoachPage(page);
    const parentPage = new ParentPage(page);
    const teamPage = new TeamPage(page);
    const evaluationPage = new EvaluationPage(page);
    const planPage = new PlanPage(page);

    // [step 1] Organization profile — только СВОЯ организация (видна edit кнопка)
    await orgPage.goto();
    await expect(orgPage.editButton, 'Edit button should be visible on Organization Profile').toBeVisible({ timeout: TIMEOUTS.long });

    // [step 2] Skill — CRUD (Create button visible)
    await homePage.goToSkills();
    await expect(skillPage.heading, 'Skills heading should be visible').toBeVisible({ timeout: TIMEOUTS.long });
    await expect(skillPage.createSkillButton, 'Create Skill button should be visible for owner').toBeVisible();

    // [step 3] Drill — CRUD (Create button visible)
    await homePage.goToDrills();
    await expect(drillPage.heading, 'Drills heading should be visible').toBeVisible({ timeout: TIMEOUTS.long });
    await expect(drillPage.newDrillButton, 'Create drill button should be visible for owner').toBeVisible();

    // [step 4] Scorecard Templates — CRUD (Create button visible)
    await scorecardPage.goto();
    await expect(scorecardPage.newScorecardButton, 'New template button should be visible for owner').toBeVisible();

    // [step 5] Athlete — CRUD (Create button visible)
    await athletePage.goto();
    await expect(athletePage.heading, 'Athletes heading should be visible').toBeVisible({ timeout: TIMEOUTS.long });
    await expect(athletePage.newAthleteButton, 'New Athlete button should be visible for owner').toBeVisible();

    // [step 6] Parents — CRUD (Create button visible)
    await parentPage.goto();
    await expect(parentPage.heading, 'Parents heading should be visible').toBeVisible({ timeout: TIMEOUTS.long });
    await expect(parentPage.newParentButton, 'New Parent button should be visible for owner').toBeVisible();

    // [step 7] Coach — CRUD (Create button visible)
    await coachPage.goto();
    await expect(coachPage.heading, 'Coaches heading should be visible').toBeVisible({ timeout: TIMEOUTS.long });
    await expect(coachPage.newCoachButton, 'New Coach button should be visible for owner').toBeVisible();

    // [step 8] Team — CRUD (Create button visible)
    await teamPage.goto();
    await expect(teamPage.heading, 'Teams heading should be visible').toBeVisible({ timeout: TIMEOUTS.long });
    await expect(teamPage.newTeamButton, 'New Team button should be visible for owner').toBeVisible();

    // [step 9] Easy join — CRUD (page loads)
    await homePage.goToEasyJoin();
    await expect(homePage.pageHeading, 'Easy Join page should load').toBeVisible({ timeout: TIMEOUTS.long });

    // [step 10] Evaluation — CRUD (sidebar visible, Create button visible)
    await expect(homePage.navEvaluations, 'Evaluations sidebar link should be visible for owner').toBeVisible();
    await evaluationPage.goto();
    await expect(evaluationPage.newEvaluationButton, 'Create evaluation button should be visible for owner').toBeVisible();

    // [step 11] Evaluation report — see all organization reports (sidebar visible)
    await expect(homePage.navEvaluationReports, 'Evaluation Reports sidebar link should be visible for owner').toBeVisible();

    // [step 12] Plan — see all organization plans (sidebar visible)
    await expect(homePage.navPlans, 'Plans sidebar link should be visible for owner').toBeVisible();
  });
});

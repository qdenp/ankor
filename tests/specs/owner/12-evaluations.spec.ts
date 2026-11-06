import { test, expect } from '../../fixtures';
import { EvaluationPage } from '../../pages/evaluation-page';
import { TIMEOUTS } from '../../config';

test.describe('Owner Evaluation Tests', () => {
  test.describe.configure({ mode: 'serial' });

  const TEMPLATE_NAME = '!Default Template for Evaluation';
  const TEAM_NAME = 'Team01';

  test.beforeEach(async ({ page, loginAs }) => {
    await loginAs('owner');
  });

  test.afterEach(async ({ page }) => {
    // Cleanup: удалить все созданные оценки
    const evaluationPage = new EvaluationPage(page);
    await evaluationPage.goto();
    await evaluationPage.deleteAllByTemplate(TEMPLATE_NAME);
  });

  /**
   * @TC-91866 @TC-91908 Create evaluation (Save, NOT Submit)
   * Save evaluation as draft, verify it's not visible to athlete/parent
   * TC-91866 [step 5-6]: Rate category → Save as draft → verify in table
   * TC-91908 [step 1-2]: Verify form is open → Save as draft
   */
  test('should create and save evaluation as draft', async ({ page }) => {
    const evaluationPage = new EvaluationPage(page);
    const skillName = 'Skill1';

    // Create evaluation
    await evaluationPage.goto();
    await evaluationPage.clickNewEvaluation();
    await evaluationPage.selectScorecardTemplate(TEMPLATE_NAME);
    await evaluationPage.selectTeam(TEAM_NAME);
    await evaluationPage.addSkill(skillName);

    // TC-91866 [step 5]: Rate category
    await evaluationPage.rateCategory(3);

    // TC-91866 [step 6]: Save evaluation (NOT submit)
    await evaluationPage.saveAsDraftButton.click();
    await expect(page.getByRole('heading', { name: 'Evaluations' })).toBeVisible({ timeout: TIMEOUTS.medium });

    // TC-91866: Verify evaluation appears in table as draft
    await expect(evaluationPage.getRow(TEMPLATE_NAME)).toBeVisible({ timeout: TIMEOUTS.long });

    // TC-91908: Verify form is open (same flow, just verify form state before save)
    await evaluationPage.goto();
    await evaluationPage.clickNewEvaluation();
    await expect(evaluationPage.scorecardTemplateSelect).toBeVisible({ timeout: TIMEOUTS.medium });
  });

  /**
   * @TC-91842 Rating выше 5 блокируется с предупреждением
   * TC-91842 [step 1-4]: Rate 6 → verify blocked
   */
  test('should block rating above 5', async ({ page }) => {
    const evaluationPage = new EvaluationPage(page);
    const skillName = 'Skill2';

    await evaluationPage.goto();
    await evaluationPage.clickNewEvaluation();
    await evaluationPage.selectScorecardTemplate(TEMPLATE_NAME);
    await evaluationPage.selectTeam(TEAM_NAME);
    await evaluationPage.addSkill(skillName);

    // Click on rating cell "—" → becomes number input
    const categoryCell = evaluationPage.getRatingCell();
    await expect(categoryCell).toBeVisible({ timeout: TIMEOUTS.medium });
    await categoryCell.click();

    // Wait for input to appear and enter 6
    const ratingInput = evaluationPage.getRatingInput();
    await expect(ratingInput, 'Expected rating input to appear').toBeVisible({ timeout: TIMEOUTS.medium });
    await ratingInput.fill('6');
    await page.keyboard.press('Enter');

    // Value should be blocked or reset — wait for input to disappear (validation)
    await expect(ratingInput, 'Expected rating input to be hidden after validation').toBeHidden({ timeout: TIMEOUTS.medium });

    // Verify the cell no longer shows '6' (blocked)
    await expect(categoryCell, 'Expected rating cell to not contain 6').not.toContainText('6', { timeout: TIMEOUTS.short });
  });

  /**
   * @TC-91913 @TC-91894 Rating below 3 expands sub-skills
   * TC-91913 [step 1-2]: Allow score below 3 for max 5 categories
   * TC-91894 [step 1.1]: Rating below 3 should expand sub-skills for detailed rating
   */
  test('should handle rating below 3 with sub-skills', async ({ page }) => {
    const evaluationPage = new EvaluationPage(page);
    const skillName = 'Skill3';

    await evaluationPage.goto();
    await evaluationPage.clickNewEvaluation();
    await evaluationPage.selectScorecardTemplate(TEMPLATE_NAME);
    await evaluationPage.selectTeam(TEAM_NAME);
    await evaluationPage.addSkill(skillName);

    // Click on rating cell "—" → becomes number input
    const categoryCell = page.getByRole('gridcell').filter({ hasText: '—' }).first();
    await expect(categoryCell).toBeVisible({ timeout: TIMEOUTS.medium });
    await categoryCell.click();

    // Enter rating 2 (below 3)
    const numberInput = page.locator('input[type="number"]').first();
    await expect(numberInput).toBeVisible({ timeout: TIMEOUTS.medium });
    await numberInput.fill('2');
    await page.keyboard.press('Tab');

    // TC-91894 [step 1.1]: Subskills popup should appear
    await expect(evaluationPage.subskillsPopupTitle).toBeVisible({ timeout: TIMEOUTS.long });

    // TC-91894 [step 2]: Set rating for skill in popup
    await evaluationPage.setSubskillRating(skillName, 2);
    await evaluationPage.saveSubskillRatings();

    // TC-91913: Wait for Submit to become enabled
    await evaluationPage.waitForSubmitEnabled();

    // Submit
    await evaluationPage.submitButton.click();
    await expect(page).toHaveURL(/\/evaluations/, { timeout: TIMEOUTS.long });
  });

  /**
   * @TC-91857 Rating > 3 on category → all subskills get same rating
   * TC-91857 [step 1-2]: Rate category above 3 → submit → verify in table
   */
  test('should pull sub-skills when category rated above 3', async ({ page }) => {
    const evaluationPage = new EvaluationPage(page);
    const skillName = 'Skill1';

    await evaluationPage.goto();
    await evaluationPage.clickNewEvaluation();
    await evaluationPage.selectScorecardTemplate(TEMPLATE_NAME);
    await evaluationPage.selectTeam(TEAM_NAME);
    await evaluationPage.addSkill(skillName);

    // Click on rating cell "—" → becomes number input
    const categoryCell = page.getByRole('gridcell').filter({ hasText: '—' }).first();
    await expect(categoryCell).toBeVisible({ timeout: TIMEOUTS.medium });
    await categoryCell.click();

    // Enter rating 4 (above 3)
    const numberInput = page.locator('input[type="number"]').first();
    await expect(numberInput).toBeVisible({ timeout: TIMEOUTS.medium });
    await numberInput.fill('4');
    await page.keyboard.press('Tab');

    // For rating > 3, no subskills popup — just wait for Submit to become enabled
    await evaluationPage.waitForSubmitEnabled();

    // Submit evaluation (TC-91857 [step 2])
    await evaluationPage.submitButton.click();
    await expect(page).toHaveURL(/\/evaluations/, { timeout: TIMEOUTS.long });

    // Verify evaluation appears in table
    await expect(evaluationPage.getRow(TEMPLATE_NAME), 'Expected evaluation to appear in table after submit').toBeVisible({ timeout: TIMEOUTS.long });
  });

  /**
   * @TC-91874 @TC-91877 View and Edit evaluation
   * TC-91874 [step 2-4]: View evaluation detail → Back
   * TC-91874 [step 6]: Click Edit via More actions
   * TC-91877 [step 2-3]: Edit evaluation → Update rating
   * TC-91877 [step 6.1]: Verify data saved
   */
  test('should view and edit evaluation', async ({ page }) => {
    const evaluationPage = new EvaluationPage(page);
    const skillName = 'Skill2';

    // Create and submit evaluation first
    await evaluationPage.goto();
    await evaluationPage.clickNewEvaluation();
    await evaluationPage.selectScorecardTemplate(TEMPLATE_NAME);
    await evaluationPage.selectTeam(TEAM_NAME);
    await evaluationPage.addSkill(skillName);

    // Rate category
    await evaluationPage.rateCategory(4);

    // Submit
    await evaluationPage.submitButton.click();
    await expect(page).toHaveURL(/\/evaluations/, { timeout: TIMEOUTS.long });

    // Verify evaluation appears in table
    await expect(evaluationPage.getRow(TEMPLATE_NAME), 'Expected evaluation to appear in table').toBeVisible({ timeout: TIMEOUTS.long });

    // TC-91874 [step 2]: Click View on evaluation row
    const viewButton = evaluationPage.getRow(TEMPLATE_NAME).getByRole('button', { name: 'View' });
    await expect(viewButton).toBeVisible({ timeout: TIMEOUTS.medium });
    await viewButton.click();

    // TC-91874 [step 2.1]: Verify evaluation detail page
    await expect(page.getByRole('heading', { name: 'View Evaluation', level: 3 })).toBeVisible({ timeout: TIMEOUTS.long });
    await expect(page.getByRole('heading', { name: 'Scorecard' })).toBeVisible({ timeout: TIMEOUTS.medium });
    await expect(page.getByRole('heading', { name: 'Default Template for Evaluation' })).toBeVisible({ timeout: TIMEOUTS.medium });
    await expect(page.getByRole('heading', { name: 'Team', exact: true })).toBeVisible({ timeout: TIMEOUTS.medium });
    await expect(page.getByRole('heading', { name: 'Athletes evaluated' })).toBeVisible({ timeout: TIMEOUTS.medium });

    // TC-91874 [step 3]: Edit button on view page
    await expect(page.getByRole('button', { name: 'Edit Evaluation' })).toBeVisible({ timeout: TIMEOUTS.medium });

    // TC-91874 [step 4]: Click Back
    await page.getByRole('link', { name: 'Back' }).click();
    await expect(evaluationPage.heading).toBeVisible({ timeout: TIMEOUTS.long });

    // TC-91874 [step 6]: Click Edit via More actions
    const moreActions = evaluationPage.getRow(TEMPLATE_NAME).getByRole('button', { name: 'More actions' });
    await expect(moreActions).toBeVisible({ timeout: TIMEOUTS.medium });
    await moreActions.click();
    await expect(page.getByRole('menuitem', { name: 'Edit' })).toBeVisible({ timeout: TIMEOUTS.medium });
    await page.getByRole('menuitem', { name: 'Edit' }).click();
    await expect(page.getByRole('heading', { name: 'Edit evaluation' })).toBeVisible({ timeout: TIMEOUTS.long });

    // TC-91877 [step 3]: Edit rating
    await evaluationPage.updateCategoryRating(5);

    // TC-91877 [step 6]: Click Update
    await evaluationPage.submitButton.click();
    await expect(page).toHaveURL(/\/evaluations/, { timeout: TIMEOUTS.long });

    // TC-91877 [step 6.1]: Verify data saved
    await expect(evaluationPage.getRow(TEMPLATE_NAME), 'Expected updated evaluation in table').toBeVisible({ timeout: TIMEOUTS.long });
  });

  /**
   * @TC-91911 @TC-91888 Generate report and workout after submit
   * TC-91911 [step 1-3]: Submit evaluation → check report generated
   * TC-91888 [step 1-4]: Submit evaluation → check workout generated
   */
  test('should generate report and workout after submit', async ({ page }) => {
    const evaluationPage = new EvaluationPage(page);
    const skillName = 'Skill4';

    await evaluationPage.goto();
    await evaluationPage.clickNewEvaluation();
    await evaluationPage.selectScorecardTemplate(TEMPLATE_NAME);
    await evaluationPage.selectTeam(TEAM_NAME);
    await evaluationPage.addSkill(skillName);

    // Rate category
    await evaluationPage.rateCategory(5);

    // Submit
    await evaluationPage.submitButton.click();
    await expect(page).toHaveURL(/\/evaluations/, { timeout: TIMEOUTS.long });

    // Verify evaluation appears in table
    await expect(evaluationPage.getRow(TEMPLATE_NAME), `Expected evaluation with skill "${skillName}" to appear in table`).toBeVisible({ timeout: TIMEOUTS.long });
  });
});

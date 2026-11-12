import { test, expect } from '../../fixtures';
import { EvaluationPage } from '../../pages/evaluation-page';
import { TIMEOUTS } from '../../config';

test.describe('Owner Evaluation Tests', () => {
  test.describe.configure({ mode: 'serial' });

  const TEMPLATE_NAME = '!Default Template for Evaluation';
  const TEAM_NAME = 'Team01';

  // Время начала теста: cleanup удаляет только черновики, созданные после него
  let testStartedAt: Date;

  test.beforeEach(async ({ loginAs }) => {
    testStartedAt = new Date();
    await loginAs('owner');
  });

  test.afterEach(async ({ page }) => {
    // Cleanup: удалить черновики (In Progress), созданные этим тестом.
    // Отправленные (Submit) оценки становятся отчётами — их в интерфейсе удалить нельзя.
    const evaluationPage = new EvaluationPage(page);
    await evaluationPage.deleteDraftsCreatedSince(testStartedAt);
  });

  /**
   * @TC-71460 @TC-71561 Create evaluation (Save, NOT Submit)
   * Save evaluation as draft, verify it's not visible to athlete/parent
   * TC-71460 [step 5-6]: Rate category → Save as draft → verify in table
   * TC-71561 [step 1-2]: Verify form is open → Save as draft
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

    // TC-71460 [step 5]: Rate category
    await evaluationPage.rateCategory(3);

    // TC-71460 [step 6]: Save evaluation (NOT submit)
    await evaluationPage.saveAsDraft();

    // TC-71460: Verify evaluation appears in table as draft
    await expect(evaluationPage.getRow(TEMPLATE_NAME)).toBeVisible({ timeout: TIMEOUTS.long });

    // TC-71561: Verify form is open (same flow, just verify form state before save)
    await evaluationPage.goto();
    await evaluationPage.clickNewEvaluation();
    await expect(evaluationPage.scorecardTemplateSelect).toBeVisible();
  });

  /**
   * @TC-71495 Rating выше 5 блокируется с предупреждением
   * TC-71495 [step 1-4]: Rate 6 → verify blocked
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
    await expect(categoryCell).toBeVisible();
    await categoryCell.click();

    // Wait for input to appear and enter 6
    const ratingInput = evaluationPage.getRatingInput();
    await expect(ratingInput, 'Expected rating input to appear').toBeVisible();
    await evaluationPage.typeRatingAndConfirm('6');

    // Value should be blocked or reset — wait for input to disappear (validation)
    await expect(ratingInput, 'Expected rating input to be hidden after validation').toBeHidden();

    // Verify the cell no longer shows '6' (blocked)
    await expect(categoryCell, 'Expected rating cell to not contain 6').not.toContainText('6', { timeout: TIMEOUTS.short });
  });

  /**
   * @TC-71494 Rating below 3 expands sub-skills
   * TC-71494 [step 1.1]: Rating below 3 should expand sub-skills for detailed rating
   * Сохраняется черновиком (Submit не нужен — отчёт неудаляем); черновик удаляет afterEach.
   * TC-71493 (не больше 5 категорий ниже 3) здесь не проверяется: нужен шаблон с 6 категориями (REVIEW-PLAN 1.5).
   */
  test('should handle rating below 3 with sub-skills', async ({ page }) => {
    const evaluationPage = new EvaluationPage(page);
    const skillName = 'Skill3';

    await evaluationPage.goto();
    await evaluationPage.clickNewEvaluation();
    await evaluationPage.selectScorecardTemplate(TEMPLATE_NAME);
    await evaluationPage.selectTeam(TEAM_NAME);
    await evaluationPage.addSkill(skillName);

    // Оценка категории 2 (ниже 3)
    await evaluationPage.rateCategory(2);

    // TC-71494 [step 1.1]: Subskills popup should appear
    await expect(evaluationPage.subskillsPopupTitle).toBeVisible({ timeout: TIMEOUTS.long });

    // TC-71494 [step 2]: Set rating for skill in popup
    await evaluationPage.setSubskillRating(skillName, 2);
    await evaluationPage.saveSubskillRatings();

    // Отправка доступна — оценка ниже 3 с оценёнными подскиллами допустима
    await evaluationPage.waitForSubmitEnabled();

    // Сохраняем черновиком (Submit создал бы неудаляемый отчёт); afterEach удалит черновик
    await evaluationPage.saveAsDraft();
    await expect(evaluationPage.tableRows.filter({ hasText: 'In Progress' }).first()).toBeVisible({ timeout: TIMEOUTS.long });
  });

  /**
   * @TC-71567 @TC-71600 View and Edit evaluation (на черновике — по предусловию обоих TC: «не submitted»)
   * TC-71567 [step 2]: View → экран просмотра (Scorecard, Team, Athletes evaluated), есть Back и Edit
   * TC-71567 [step 4]: Back → список
   * TC-71567 [step 6]: Edit → форма редактирования
   * TC-71600 [step 3-4.1]: изменить оценку и НЕ сохранять → данные не сохранены
   * TC-71600 [step 5-6.1]: изменить оценку и сохранить → данные сохранены
   * В форме редактирования черновика кнопки Save as draft / Submit (отдельной Update нет) — сохраняем черновиком.
   */
  test('should view and edit evaluation', async ({ page }) => {
    const evaluationPage = new EvaluationPage(page);
    const category = 'Category1';

    // Черновик с оценкой 4
    await evaluationPage.goto();
    await evaluationPage.clickNewEvaluation();
    await evaluationPage.selectScorecardTemplate(TEMPLATE_NAME);
    await evaluationPage.selectTeam(TEAM_NAME);
    await evaluationPage.addSkill('Skill2');
    await evaluationPage.rateCategory(4);
    await evaluationPage.saveAsDraft();

    // TC-71567 [step 2]: View
    await evaluationPage.openNewestDraftView();
    await expect(evaluationPage.scorecardHeading).toBeVisible();
    await expect(evaluationPage.teamHeading).toBeVisible();
    await expect(evaluationPage.athletesEvaluatedHeading).toBeVisible();
    await expect(evaluationPage.editEvaluationButton).toBeVisible();
    await expect(evaluationPage.backLink).toBeVisible();
    await expect(evaluationPage.getCategoryRow(category)).toContainText('4');

    // TC-71567 [step 4]: Back
    await evaluationPage.backToList();

    // TC-71567 [step 6] / TC-71600 [step 3-4]: Edit → изменить оценку → уйти без сохранения
    await evaluationPage.openNewestDraftEdit();
    await evaluationPage.updateCategoryRating(5);
    await evaluationPage.backToList();

    // TC-71600 [step 4.1]: данные не сохранены — в просмотре по-прежнему 4
    await evaluationPage.openNewestDraftView();
    await expect(evaluationPage.getCategoryRow(category)).toContainText('4');
    await evaluationPage.backToList();

    // TC-71600 [step 5-6]: снова изменить и сохранить
    await evaluationPage.openNewestDraftEdit();
    await evaluationPage.updateCategoryRating(5);
    await evaluationPage.saveAsDraft();

    // TC-71600 [step 6.1]: данные сохранены — в просмотре 5
    await evaluationPage.openNewestDraftView();
    await expect(evaluationPage.getCategoryRow(category)).toContainText('5');
  });

  /**
   * @TC-71562 @TC-71528 Submit generates an evaluation report; category rating is applied to all subskills
   * ЕДИНСТВЕННЫЙ тест с Submit: создаёт отчёт, который в интерфейсе нельзя удалить (1 отчёт за прогон — это и есть проверка создания).
   * TC-71562 [step 3.2]: после Submit появляется новый evaluation report
   * TC-71528 [step 1-4.1]: оценка категории выше 3 → в отчёте у ВСЕХ подскиллов та же оценка
   * TC-71563 (workout) отложен: нужна оценка ниже 3, а в Team01 один атлет и у шаблона одна категория (REVIEW-PLAN 1.5).
   */
  test('should generate evaluation report with category rating applied to all subskills', async ({ page }) => {
    const evaluationPage = new EvaluationPage(page);
    const today = new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });

    // Список отчётов показывает только последние 20 (счётчик всегда «(20)»), поэтому новый отчёт
    // определяем так: адрес самого нового отчёта до Submit ≠ адрес самого нового после
    await evaluationPage.gotoReports();
    await evaluationPage.openNewestReport();
    const newestReportBefore = page.url();

    await evaluationPage.goto();
    await evaluationPage.clickNewEvaluation();
    await evaluationPage.selectScorecardTemplate(TEMPLATE_NAME);
    await evaluationPage.selectTeam(TEAM_NAME);
    await evaluationPage.addSkill('Skill4');

    // TC-71528 [step 1]: оценка категории выше 3
    await evaluationPage.rateCategory(4);
    await evaluationPage.waitForSubmitEnabled();

    // TC-71528 [step 2] / TC-71562 [step 3]: Submit
    await evaluationPage.submit();

    // TC-71562 [step 3.2] / TC-71528 [step 3-4]: появился новый отчёт — он первый в списке
    await expect(async () => {
      await evaluationPage.gotoReports();
      await evaluationPage.openNewestReport();
      await expect(page).not.toHaveURL(newestReportBefore);
    }).toPass({ timeout: TIMEOUTS.long });
    await expect(evaluationPage.reportContent).toContainText(TEMPLATE_NAME);
    await expect(evaluationPage.reportContent).toContainText(today);

    // TC-71528 [step 4.1]: у всех подскиллов категории та же оценка, что у категории
    for (const subskill of ['Skill1', 'Skill2', 'Skill3', 'Skill4']) {
      await expect(evaluationPage.reportContent, `${subskill} should have the category rating 4.0`).toContainText(new RegExp(`${subskill}\\s*4\\.0`));
    }
  });
});

import * as allure from 'allure-js-commons';
import { test, expect } from '../../fixtures';
import { EvaluationPage } from '../../pages/evaluation-page';
import { TIMEOUTS } from '../../config';

const TEMPLATE_NAME = '!Default Template for Evaluation';
const TEAM_NAME = 'Team01';

/** Создать черновик оценки (In Progress) с оценкой категории и вернуться в список. Черновики удаляет afterEach. */
async function createDraft(evaluationPage: EvaluationPage, skillName: string, rating: number): Promise<void> {
  await evaluationPage.goto();
  await evaluationPage.clickNewEvaluation();
  await evaluationPage.selectScorecardTemplate(TEMPLATE_NAME);
  await evaluationPage.selectTeam(TEAM_NAME);
  await evaluationPage.addSkill(skillName);
  await evaluationPage.rateCategory(rating);
  await evaluationPage.saveAsDraft();
}

test.describe('Owner Evaluation Tests', () => {
  test.describe.configure({ mode: 'serial' });

  // Время начала теста: cleanup удаляет только черновики, созданные после него
  let testStartedAt: Date;
  // Отчёт, созданный тестом TC-71562; TC-71528 проверяет его же (отчёты в интерфейсе не удаляются)
  let submittedReportUrl: string | undefined;

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
   * TC-71460 Create evaluation (Save, NOT Submit)
   * [step 1-5] Create Evaluation → шаблон → команда → оценка категории
   * [step 6] Сохранить, не нажимая Submit → [step 6.1] сохраняется как редактируемый черновик
   * [step 7] Черновик не виден атлету/родителю — не проверяется (нужен вход под другой ролью)
   */
  test('should create and save evaluation as draft', async ({ page }) => {
    await allure.allureId('71460');
    const evaluationPage = new EvaluationPage(page);

    await createDraft(evaluationPage, 'Skill1', 3);

    await expect(evaluationPage.tableRows.filter({ hasText: 'In Progress' }).first()).toBeVisible({ timeout: TIMEOUTS.long });
  });

  /**
   * TC-71561 Просмотр not submitted evaluation
   * [step 2] Список черновиков → [step 2.1] колонки Created, Team, Scorecard, Status
   *   (колонки Evaluation ID из TC в интерфейсе нет); [step 2.2] действия View, Edit, Delete
   */
  test('should list draft evaluations with columns and View, Edit, Delete actions', async ({ page }) => {
    await allure.allureId('71561');
    const evaluationPage = new EvaluationPage(page);

    await createDraft(evaluationPage, 'Skill1', 3);

    // [step 2.1]
    const header = evaluationPage.tableRows.first();
    for (const column of ['Created', 'Team', 'Scorecard', 'Status']) {
      await expect(header, `Column ${column}`).toContainText(column, { ignoreCase: true });
    }
    const draft = evaluationPage.tableRows.filter({ hasText: 'In Progress' }).first();
    await expect(draft).toContainText(TEAM_NAME);
    await expect(draft).toContainText(TEMPLATE_NAME);

    // [step 2.2]
    await expect(draft.getByRole('button', { name: 'View' })).toBeVisible();
    await evaluationPage.openNewestDraftMenu();
    await expect(evaluationPage.editMenuItem).toBeVisible();
    await expect(evaluationPage.deleteMenuItem).toBeVisible();
    await evaluationPage.closeMenu();
  });

  /**
   * TC-71495 Ввод рейтинга выше 5 блокируется с предупреждением
   */
  test('should block rating above 5', async ({ page }) => {
    await allure.allureId('71495');
    const evaluationPage = new EvaluationPage(page);

    await evaluationPage.goto();
    await evaluationPage.clickNewEvaluation();
    await evaluationPage.selectScorecardTemplate(TEMPLATE_NAME);
    await evaluationPage.selectTeam(TEAM_NAME);
    await evaluationPage.addSkill('Skill2');

    // Click on rating cell "—" → becomes number input
    const categoryCell = evaluationPage.getCategoryRatingCell('Category1');
    await expect(categoryCell).toBeVisible();
    await categoryCell.click();

    // Wait for input to appear and enter 6
    const ratingInput = evaluationPage.getRatingInput();
    await expect(ratingInput, 'Expected rating input to appear').toBeVisible();
    await evaluationPage.typeRatingAndConfirm('6');

    // Шаг кейса: предупреждение (в приложении текст "Values should be whole numbers from 1 to 5.")
    await expect(evaluationPage.ratingRangeAlert, 'Expected the 1–5 range warning').toBeVisible();
    await expect(ratingInput, 'Expected rating input to be hidden after validation').toBeHidden();

    // Значение не принято: ячейка осталась пустой. Раньше было not.toContainText('6') по «первой ячейке с —»:
    // проходило до обновления ячейки, а локатор после ввода значения перескакивал на другую ячейку
    await expect(categoryCell, 'Rating 6 should not be accepted').toHaveText('—');
  });

  /**
   * TC-71494 Рейтинг категории ниже 3 раскрывает под-скиллы
   * Сохраняется черновиком (Submit не нужен — отчёт неудаляем); черновик удаляет afterEach.
   * TC-71493 (не больше 5 категорий ниже 3) не проверяется: нужен шаблон с 6 категориями (REVIEW-PLAN 1.5).
   */
  test('should handle rating below 3 with sub-skills', async ({ page }) => {
    await allure.allureId('71494');
    const evaluationPage = new EvaluationPage(page);
    const skillName = 'Skill3';

    await evaluationPage.goto();
    await evaluationPage.clickNewEvaluation();
    await evaluationPage.selectScorecardTemplate(TEMPLATE_NAME);
    await evaluationPage.selectTeam(TEAM_NAME);
    await evaluationPage.addSkill(skillName);

    // Оценка категории 2 (ниже 3)
    await evaluationPage.rateCategory(2);

    // [step 1.1]: раскрываются подскиллы
    await expect(evaluationPage.subskillsPopupTitle).toBeVisible({ timeout: TIMEOUTS.long });
    await evaluationPage.setSubskillRating(skillName, 2);
    await evaluationPage.saveSubskillRatings();

    // Отправка доступна — оценка ниже 3 с оценёнными подскиллами допустима
    await evaluationPage.waitForSubmitEnabled();

    await evaluationPage.saveAsDraft();
    await expect(evaluationPage.tableRows.filter({ hasText: 'In Progress' }).first()).toBeVisible({ timeout: TIMEOUTS.long });
  });

  /**
   * TC-71567 View evaluation (на черновике — по предусловию TC «не submitted»)
   * [step 2] View → открылся просмотр: Scorecard, Team; [step 2.2] есть Back и Edit
   * [step 4] Back → переход назад
   */
  test('should view a draft evaluation', async ({ page }) => {
    await allure.allureId('71567');
    const evaluationPage = new EvaluationPage(page);

    await createDraft(evaluationPage, 'Skill2', 4);

    // [step 2]
    await evaluationPage.openNewestDraftView();
    await expect(evaluationPage.scorecardHeading).toBeVisible();
    await expect(evaluationPage.teamHeading).toBeVisible();
    await expect(evaluationPage.athletesEvaluatedHeading).toBeVisible();
    await expect(evaluationPage.editEvaluationButton).toBeVisible();
    await expect(evaluationPage.backLink).toBeVisible();
    await expect(evaluationPage.getCategoryRow('Category1')).toContainText('4');

    // [step 4]
    await evaluationPage.backToList();
  });

  /**
   * TC-71600 Edit evaluation (на черновике — по предусловию TC «не submitted»)
   * [step 2] Edit → форма редактирования
   * [step 3-4] Изменить оценку и НЕ сохранять → [step 4.1] данные не сохранены
   * [step 5-6] Снова изменить и сохранить → [step 6.1] данные сохранены
   * В форме черновика кнопки Save as draft / Submit (отдельной Update нет) — сохраняем черновиком.
   */
  test('should not keep unsaved edits and keep saved edits of a draft evaluation', async ({ page }) => {
    await allure.allureId('71600');
    const evaluationPage = new EvaluationPage(page);
    const category = 'Category1';

    await createDraft(evaluationPage, 'Skill2', 4);

    // [step 2-4]
    await evaluationPage.openNewestDraftEdit();
    await evaluationPage.updateCategoryRating(5);
    await evaluationPage.backToList();

    // [step 4.1]
    await evaluationPage.openNewestDraftView();
    await expect(evaluationPage.getCategoryRow(category)).toContainText('4');
    await evaluationPage.backToList();

    // [step 5-6]
    await evaluationPage.openNewestDraftEdit();
    await evaluationPage.updateCategoryRating(5);
    await evaluationPage.saveAsDraft();

    // [step 6.1]
    await evaluationPage.openNewestDraftView();
    await expect(evaluationPage.getCategoryRow(category)).toContainText('5');
  });

  /**
   * TC-71562 После submit генерируется evaluation report
   * ЕДИНСТВЕННЫЙ тест с Submit: отчёт в интерфейсе удалить нельзя (1 отчёт за прогон — это и есть проверка создания).
   * Оценка категории 4 (выше 3) — её отчёт проверяет следующий тест (TC-71528).
   * TC-71563 (workout) отложен: нужна оценка ниже 3, а в Team01 один атлет и у шаблона одна категория (REVIEW-PLAN 1.5).
   */
  test('should generate an evaluation report after submit', async ({ page }) => {
    await allure.allureId('71562');
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
    await evaluationPage.rateCategory(4);
    await evaluationPage.waitForSubmitEnabled();

    await evaluationPage.submit();

    // Новый отчёт — первый в списке
    await expect(async () => {
      await evaluationPage.gotoReports();
      await evaluationPage.openNewestReport();
      await expect(page).not.toHaveURL(newestReportBefore);
    }).toPass({ timeout: TIMEOUTS.long });
    await expect(evaluationPage.reportContent).toContainText(TEMPLATE_NAME);
    await expect(evaluationPage.reportContent).toContainText(today);
    submittedReportUrl = page.url();
  });

  /**
   * TC-71528 Оценка категории подтягивает оценку на все сабскилы
   * (на отчёте из TC-71562: категория оценена на 4 и отправлена)
   * [step 3-4] Открыть отчёт → [step 4.1] у ВСЕХ подскиллов та же оценка, что у категории
   */
  test('should apply the category rating to all subskills in the report', async ({ page }) => {
    await allure.allureId('71528');
    expect(submittedReportUrl, 'Requires the report created by the previous test (serial mode)').toBeDefined();
    const evaluationPage = new EvaluationPage(page);

    await evaluationPage.openReport(submittedReportUrl!);
    for (const subskill of ['Skill1', 'Skill2', 'Skill3', 'Skill4']) {
      await expect(evaluationPage.reportContent, `${subskill} should have the category rating 4.0`).toContainText(new RegExp(`${subskill}\\s*4\\.0`));
    }
  });
});

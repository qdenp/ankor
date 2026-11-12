import * as allure from 'allure-js-commons';
import type { Page } from '@playwright/test';
import { test, expect } from '../../fixtures';
import { EvaluationPage } from '../../pages/evaluation-page';
import { SignInPage } from '../../pages/sign-in-page';
import { EVALUATED_ATHLETE, TIMEOUTS } from '../../config';

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

/**
 * Новый отчёт после Submit. Список показывает только последние 20 (счётчик всегда «(20)»), поэтому
 * запоминаем адрес самого нового отчёта до Submit, а после ждём, пока самый новый сменится.
 */
async function newestReportUrl(evaluationPage: EvaluationPage, page: Page): Promise<string> {
  await evaluationPage.gotoReports();
  await evaluationPage.openNewestReport();
  return page.url();
}

async function openNewReportAfter(evaluationPage: EvaluationPage, page: Page, previousUrl: string): Promise<void> {
  await expect(async () => {
    await evaluationPage.gotoReports();
    await evaluationPage.openNewestReport();
    await expect(page).not.toHaveURL(previousUrl);
  }).toPass({ timeout: TIMEOUTS.long });
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
   * Один из двух тестов с Submit (второй — workout, TC-71563): отчёт в интерфейсе удалить нельзя,
   * 1 отчёт за прогон — это и есть проверка создания. Оценка категории 4 (выше 3) — её отчёт проверяет TC-71528.
   */
  test('should generate an evaluation report after submit', async ({ page }) => {
    await allure.allureId('71562');
    const evaluationPage = new EvaluationPage(page);
    const today = new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });

    const newestReportBefore = await newestReportUrl(evaluationPage, page);

    await evaluationPage.goto();
    await evaluationPage.clickNewEvaluation();
    await evaluationPage.selectScorecardTemplate(TEMPLATE_NAME);
    await evaluationPage.selectTeam(TEAM_NAME);
    await evaluationPage.addSkill('Skill4');
    await evaluationPage.rateCategory(4);
    await evaluationPage.waitForSubmitEnabled();

    await evaluationPage.submit();

    await openNewReportAfter(evaluationPage, page, newestReportBefore);
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

/**
 * TC-71563 — отдельная группа без ретраев: в serial-группе ретрай перезапускает ВСЮ группу, включая Submit,
 * и каждый повтор оставлял бы ещё неудаляемые отчёты. Здесь не больше одного Submit за прогон.
 */
test.describe('Owner Evaluation Workout', () => {
  test.describe.configure({ retries: 0 });

  test.beforeEach(async ({ loginAs }) => {
    await loginAs('owner');
  });

  /**
   * TC-71563 После submit генерируется персонализированный workout
   * Отдельная оценка ниже 3 и второй Submit: +1 неудаляемый отчёт за прогон (выбрано пользователем).
   * Workout в приложении — блок отчёта "Recommended drills" (дриллы с Play / View), отдельной вкладки нет;
   * в отчёте с оценкой 4.0 (TC-71562) там "No recommended drills for the selected focus skills."
   * [step 1] Submit оценки с рейтингом ниже 3 → [step 3] в отчёте есть рекомендованные дриллы
   * [step 4] Зайти атлетом → в его отчёте тоже есть рекомендованные дриллы
   */
  test('should generate a personalized workout after submit with a rating below 3', async ({ page, browser, baseURL }) => {
    await allure.allureId('71563');
    const evaluationPage = new EvaluationPage(page);
    const skillName = 'Skill3';
    // Данные атлета — до Submit: без ANKOR_EVAL_ATHLETE_* тест падает раньше, чем создаст неудаляемый отчёт
    const athlete = { email: EVALUATED_ATHLETE.email, password: EVALUATED_ATHLETE.password };

    const newestReportBefore = await newestReportUrl(evaluationPage, page);

    // [step 1] Оценка категории 2: раскрываются подскиллы, их тоже нужно оценить
    await evaluationPage.goto();
    await evaluationPage.clickNewEvaluation();
    await evaluationPage.selectScorecardTemplate(TEMPLATE_NAME);
    await evaluationPage.selectTeam(TEAM_NAME);
    await evaluationPage.addSkill(skillName);
    await evaluationPage.rateCategory(2);
    await expect(evaluationPage.subskillsPopupTitle).toBeVisible({ timeout: TIMEOUTS.long });
    await evaluationPage.setSubskillRating(skillName, 2);
    await evaluationPage.saveSubskillRatings();
    await evaluationPage.waitForSubmitEnabled();
    await evaluationPage.submit();

    await openNewReportAfter(evaluationPage, page, newestReportBefore);
    const reportUrl = page.url();

    // Это отчёт этого теста: общая оценка в Overview — 2.0, как поставлено. Самый новый отчёт мог бы оказаться
    // чужим, если кто-то отправил оценку в те же секунды; у отчёта 71562 там 4.0
    await expect(evaluationPage.reportContent, 'Newest report should be the one rated 2 by this test').toContainText(/Overview[\s\S]*?metrics\.\s*2\.0/);

    // [step 3] Owner: в отчёте атлета есть рекомендованные дриллы
    await expect(evaluationPage.reportContent).toContainText(EVALUATED_ATHLETE.name);
    await expect(evaluationPage.recommendedDrillsHeading).toBeVisible();
    await expect(evaluationPage.recommendedDrillViewButtons.first(), 'Workout drills should be recommended').toBeVisible();
    // После появления дриллов — заглушки нет (сама по себе toBeHidden прошла бы и до рендера блока)
    await expect(evaluationPage.noRecommendedDrillsText).toBeHidden();

    // [step 4] Атлет видит тот же workout. Отдельный контекст: сессия owner не трогается
    const athleteContext = await browser.newContext({ baseURL });
    try {
      const athleteTab = await athleteContext.newPage();
      const signInPage = new SignInPage(athleteTab);
      const athleteReport = new EvaluationPage(athleteTab);

      await signInPage.goto();
      await signInPage.login(athlete.email, athlete.password);
      await expect(athleteReport.navHome, 'Evaluated athlete should be logged in').toBeVisible({ timeout: TIMEOUTS.long });

      await athleteReport.openReport(reportUrl);
      await expect(athleteReport.recommendedDrillsHeading).toBeVisible({ timeout: TIMEOUTS.long });
      await expect(athleteReport.recommendedDrillViewButtons.first(), 'Athlete should see the workout drills').toBeVisible();
      await expect(athleteReport.noRecommendedDrillsText).toBeHidden();
    } finally {
      await athleteContext.close();
    }
  });
});

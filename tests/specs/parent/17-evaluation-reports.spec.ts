import * as allure from 'allure-js-commons';
import { test, expect } from '../../fixtures';
import { EvaluationPage } from '../../pages/evaluation-page';
import { SignInPage } from '../../pages/sign-in-page';
import { CREDENTIALS, EVALUATED_ATHLETE, MULTI_CHILD_PARENT, ROLE_ATHLETE_NAME, TIMEOUTS } from '../../config';

/**
 * 17 — Evaluation Reports для роли Parent.
 */
test.describe('Parent Evaluation Reports', () => {
  test.describe.configure({ mode: 'serial' });

  /**
   * 71602 Parent видит отчёты привязанных к нему атлетов (родитель роли parent — ребёнок Athlete User).
   * Чужих нет — первой страницы достаточно: самые новые отчёты организации — Athlete Last.
   */
  test('parent sees only reports of own athletes', async ({ page, loginAs }) => {
    await allure.allureId('71602');
    await loginAs('parent');
    const evaluationPage = new EvaluationPage(page);

    await evaluationPage.gotoReports();

    await expect(evaluationPage.getReportCardsOfAthlete(ROLE_ATHLETE_NAME).first()).toBeVisible({ timeout: TIMEOUTS.long });
    await expect(
      evaluationPage.getReportCardsNotOfAthletes([ROLE_ATHLETE_NAME]),
      'Reports of athletes not linked to the parent should not be listed',
    ).toHaveCount(0);
  });

  /**
   * 71604 Родитель нескольких атлетов из разных команд переходит к отчётам каждого ребёнка.
   * Parent Multi (дети Athlete Last, Team01, и Athlete Second, Team02) создаётся tests/setup один раз;
   * это не роль — вход формой в отдельном контексте (AGENTS §8).
   */
  test('parent of several athletes opens the report of each child', async ({ browser, baseURL }) => {
    await allure.allureId('71604');
    const context = await browser.newContext({ baseURL });
    try {
      const page = await context.newPage();
      const signInPage = new SignInPage(page);
      const evaluationPage = new EvaluationPage(page);
      const [firstChild, secondChild] = MULTI_CHILD_PARENT.children;

      await signInPage.goto();
      // Пароль у всех тестовых аккаунтов один (AGENTS §5)
      await signInPage.login(MULTI_CHILD_PARENT.email, CREDENTIALS.parent.password);
      await expect(evaluationPage.navHome, 'Parent Multi should be logged in (created by tests/setup)').toBeVisible({ timeout: TIMEOUTS.long });

      // [step 1] В списке только отчёты детей этого родителя. Чужие отчёты в организации — только Athlete User,
      // самые старые, поэтому проверяем и первую, и последнюю страницу (на первой — одни отчёты Athlete Last)
      await evaluationPage.gotoReports();
      await expect(evaluationPage.getReportCardsOfAthlete(EVALUATED_ATHLETE.name).first()).toBeVisible({ timeout: TIMEOUTS.long });
      await expect(
        evaluationPage.getReportCardsNotOfAthletes(MULTI_CHILD_PARENT.children),
        'Only reports of the parent\'s children should be listed (first page)',
      ).toHaveCount(0);
      await evaluationPage.goToLastReportsPage();
      await expect(evaluationPage.getReportCardsOfAthlete(EVALUATED_ATHLETE.name).first()).toBeVisible();
      await expect(
        evaluationPage.getReportCardsNotOfAthletes(MULTI_CHILD_PARENT.children),
        'Only reports of the parent\'s children should be listed (last page)',
      ).toHaveCount(0);

      // [step 2] Отчёт ребёнка 1
      await evaluationPage.gotoReports();
      await evaluationPage.openReportOfAthlete(firstChild);
      await expect(evaluationPage.getReportDetailAthlete(firstChild)).toBeVisible();

      // [step 3] Отчёт ребёнка 2 — у него один отчёт, со временем он уезжает с первой страницы
      await evaluationPage.gotoReports();
      await evaluationPage.openReportOfAthlete(secondChild);
      await expect(evaluationPage.getReportDetailAthlete(secondChild)).toBeVisible();
    } finally {
      await context.close();
    }
  });
});

import * as allure from 'allure-js-commons';
import { test, expect } from '../../fixtures';
import { EvaluationPage } from '../../pages/evaluation-page';
import { EVALUATED_ATHLETE, ROLE_ATHLETE_NAME, TIMEOUTS } from '../../config';

/**
 * 17 — Evaluation Reports для роли Coach.
 */
test.describe('Coach Evaluation Reports', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ loginAs }) => {
    await loginAs('coach');
  });

  /**
   * 71603 Coach/Administrator/Owner видят все завершённые отчёты организации (тот же кейс — owner/17).
   * «Все» — видны отчёты разных атлетов: новые — Athlete Last, самые старые (последняя страница) — Athlete User.
   * У coach свой адрес страницы (/reports/coach-evaluation-reports) — переход через меню.
   */
  test('coach sees evaluation reports of all athletes of the organization', async ({ page }) => {
    await allure.allureId('71603');
    const evaluationPage = new EvaluationPage(page);

    await evaluationPage.gotoReports();
    await expect(evaluationPage.getReportCardsOfAthlete(EVALUATED_ATHLETE.name).first()).toBeVisible({ timeout: TIMEOUTS.long });

    await evaluationPage.goToLastReportsPage();
    await expect(evaluationPage.getReportCardsOfAthlete(ROLE_ATHLETE_NAME).first()).toBeVisible();
  });
});

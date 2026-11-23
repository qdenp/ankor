import * as allure from 'allure-js-commons';
import { test, expect } from '../../fixtures';
import { EvaluationPage } from '../../pages/evaluation-page';
import { EVALUATED_ATHLETE, ROLE_ATHLETE_NAME, TIMEOUTS } from '../../config';

/**
 * 17 — Evaluation Reports для роли Owner.
 */
test.describe('Owner Evaluation Reports', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ loginAs }) => {
    await loginAs('owner');
  });

  /**
   * 71603 Coach/Administrator/Owner видят все завершённые отчёты организации (тот же кейс — coach/17).
   * «Все» — видны отчёты разных атлетов: самые новые — Athlete Last (их отправляет owner/12-evaluations),
   * самые старые (последняя страница) — Athlete User. Поиска и фильтра по атлету на странице нет.
   */
  test('owner sees evaluation reports of all athletes of the organization', async ({ page }) => {
    await allure.allureId('71603');
    const evaluationPage = new EvaluationPage(page);

    await evaluationPage.gotoReports();
    await expect(evaluationPage.getReportCardsOfAthlete(EVALUATED_ATHLETE.name).first()).toBeVisible({ timeout: TIMEOUTS.long });

    await evaluationPage.goToLastReportsPage();
    await expect(evaluationPage.getReportCardsOfAthlete(ROLE_ATHLETE_NAME).first()).toBeVisible();
  });
});

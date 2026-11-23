import * as allure from 'allure-js-commons';
import { test, expect } from '../../fixtures';
import { EvaluationPage } from '../../pages/evaluation-page';
import { ROLE_ATHLETE_NAME, TIMEOUTS } from '../../config';

/**
 * 17 — Evaluation Reports для роли Athlete.
 */
test.describe('Athlete Evaluation Reports', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ loginAs }) => {
    await loginAs('athlete');
  });

  /**
   * 71601 Athlete видит свои репорты. Чужих нет — проверка первой страницы достаточна: самые новые отчёты
   * организации — Athlete Last (owner/12-evaluations отправляет их каждый прогон), утечка была бы здесь.
   */
  test('athlete sees only own evaluation reports', async ({ page }) => {
    await allure.allureId('71601');
    const evaluationPage = new EvaluationPage(page);

    await evaluationPage.gotoReports();

    await expect(evaluationPage.getReportCardsOfAthlete(ROLE_ATHLETE_NAME).first()).toBeVisible({ timeout: TIMEOUTS.long });
    await expect(
      evaluationPage.getReportCardsNotOfAthletes([ROLE_ATHLETE_NAME]),
      'Reports of other athletes should not be listed',
    ).toHaveCount(0);
  });
});

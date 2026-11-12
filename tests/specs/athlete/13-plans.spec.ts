import * as allure from 'allure-js-commons';
import { test, expect } from '../../fixtures';
import { PlanPage } from '../../pages/plan-page';
import { PLANS, TIMEOUTS } from '../../config';

/**
 * 13 — Practice Plans for Athlete role.
 * Athlete tests run sequentially within the role.
 */
test.describe('Athlete Plan Tests', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ loginAs }) => {
    await loginAs('athlete');
  });

  // 72609: Athlete cannot edit invited plan
  test('athlete cannot edit invited plan', async ({ page }) => {
    await allure.allureId('72609');
    const planPage = new PlanPage(page);

    // [step 1] Зайти атлетом, перейти в Plan > Invited
    await planPage.goto();
    await planPage.goToInvited();

    // [step 2] План, на который атлет только приглашён (не владелец), есть на вкладке и без Edit.
    // Сначала — что карточка есть: на пустой вкладке проверка «нет Edit» проходила впустую (REVIEW-PLAN 2.4)
    const invitedPlan = planPage.getPlanCard(PLANS.athleteInvited.name);
    await expect(invitedPlan, 'Invited plan card should be visible (created by tests/setup)').toBeVisible({ timeout: TIMEOUTS.long });
    await expect(planPage.getPlanCardEditLink(PLANS.athleteInvited.name), 'Edit link should not be visible on invited plan card').toBeHidden();
  });

  // 72622: Athlete does not see Org Plans tab
  test('athlete does not see Org Plans tab', async ({ page }) => {
    await allure.allureId('72622');
    const planPage = new PlanPage(page);

    // [step 1] Перейти в Practice Plans
    await planPage.goto();

    // [step 1.1] exp нет вкладки Org Plans
    await expect(planPage.orgPlansTab).not.toBeVisible();
  });
});

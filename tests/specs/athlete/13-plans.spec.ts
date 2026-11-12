import * as allure from 'allure-js-commons';
import { test, expect } from '../../fixtures';
import { PlanPage } from '../../pages/plan-page';

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

    // [step 2] Открыть план, на который атлет только приглашён (не владелец)
    // Проверяем что на карточке плана нет кнопки Edit
    await expect(planPage.planCardEditLink, 'Edit link should not be visible on invited plan card').not.toBeVisible();
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

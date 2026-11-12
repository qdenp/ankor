import * as allure from 'allure-js-commons';
import { test, expect } from '../../fixtures';
import { PlanPage } from '../../pages/plan-page';

/**
 * 13 — Practice Plans for Parent role.
 * Parent tests run sequentially within the role.
 */
test.describe('Parent Plan Tests', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ loginAs }) => {
    await loginAs('parent');
  });

  // 71643: Parent can view plans
  test('parent can view plans', async ({ page }) => {
    await allure.allureId('71643');
    const planPage = new PlanPage(page);

    // [step 1] Зайти родителем в Plans
    await planPage.goto();

    // Parent видит My Plans и Invited вкладки (но не Prebuilt и не Org Plans)
    await expect(planPage.myPlansTab).toBeVisible();
    await expect(planPage.invitedTab).toBeVisible();

    // Parent не видит Prebuilt Plans
    await expect(planPage.prebuiltTab).not.toBeVisible();
  });

  // 72622: Parent does not see Org Plans tab
  test('parent does not see Org Plans tab', async ({ page }) => {
    await allure.allureId('72622');
    const planPage = new PlanPage(page);

    // [step 1] Перейти в Practice Plans
    await planPage.goto();

    // [step 1.1] exp нет вкладки Org Plans
    await expect(planPage.orgPlansTab).not.toBeVisible();
  });
});

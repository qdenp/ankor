import { test, expect } from '../../fixtures';
import { PlanPage } from '../../pages/plan-page';
import { TIMEOUTS } from '../../config';
import { createPlanTabTests, ROLE_TAB_EXPECTATIONS } from '../../factories/plan-tabs.factory';

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
  test('@TC-71643 parent can view plans', async ({ page }) => {
    const planPage = new PlanPage(page);

    // [step 1] Зайти родителем в Plans
    await planPage.goto();

    // Parent видит My Plans и Invited вкладки (но не Prebuilt и не Org Plans)
    await expect(planPage.myPlansTab).toBeVisible({ timeout: TIMEOUTS.medium });
    await expect(planPage.invitedTab).toBeVisible({ timeout: TIMEOUTS.medium });

    // Parent не видит Prebuilt Plans
    await expect(planPage.prebuiltTab).not.toBeVisible({ timeout: TIMEOUTS.medium });
  });

  // 72622: Parent does not see Org Plans tab
  test('@TC-72622 parent does not see Org Plans tab', async ({ page }) => {
    const planPage = new PlanPage(page);

    // [step 1] Перейти в Practice Plans
    await planPage.goto();

    // [step 1.1] exp нет вкладки Org Plans
    await expect(planPage.orgPlansTab).not.toBeVisible({ timeout: TIMEOUTS.medium });
  });
});

createPlanTabTests(test, 'parent', ROLE_TAB_EXPECTATIONS.parent);

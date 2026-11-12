import { test, expect } from '../../fixtures';
import { PlanPage } from '../../pages/plan-page';
import { TIMEOUTS } from '../../config';
import { createPlanTabTests, ROLE_TAB_EXPECTATIONS } from '../../factories/plan-tabs.factory';

/**
 * 13 — Practice Plans (пункт меню Practice Plans).
 * Owner tests run sequentially within the role.
 */
test.describe('Owner Plan Tests', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ loginAs }) => {
    await loginAs('owner');
  });

  // 72600: Create Plan as Administrator / Owner
  test('@TC-72600 should create plan and see in My Plans', async ({ page }) => {
    const planPage = new PlanPage(page);

    await planPage.goto();
    await planPage.goToMyPlans();

    const planName = `Test Plan ${Date.now()}`;
    await planPage.clickNewPlan();
    await planPage.fillPlanForm({ name: planName });

    // Добавляем drill через PO метод
    await planPage.addFirstDrill();

    // Сохраняем план и возвращаемся на My Plans через PO метод
    await planPage.savePlanAndReturnToMyPlans();

    // Проверяем, что план создан и отображается — используем поиск
    await planPage.search(planName);
    await expect(planPage.searchInput).toHaveValue(planName);
    await expect(planPage.getPlanCard(planName)).toBeVisible({ timeout: TIMEOUTS.long });
  });

  // 71645: View Plan Owner / Admin
  test('@TC-71645 should see all plan tabs as owner', async ({ page }) => {
    const planPage = new PlanPage(page);

    await planPage.goto();

    // Проверяем вкладки
    await expect(planPage.myPlansTab).toBeVisible();
    await expect(planPage.invitedTab).toBeVisible();
    await expect(planPage.prebuiltTab).toBeVisible();
    await expect(planPage.orgPlansTab).toBeVisible();
  });

  // 91843: Non-sysadmin no Prebuilt checkbox
  test('@TC-72612 non-sysadmin roles do not see Prebuilt checkbox', async ({ page }) => {
    const planPage = new PlanPage(page);

    await planPage.goto();
    await planPage.clickNewPlan();

    // Проверяем, что чекбокса Prebuilt нет
    await expect(planPage.prebuiltCheckbox, 'Prebuilt checkbox should not be visible for non-sysadmin').not.toBeVisible();

    await planPage.cancelButton.click();
  });
});

// Tab visibility tests via factory
createPlanTabTests(test, 'owner', ROLE_TAB_EXPECTATIONS.owner);

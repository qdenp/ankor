import { test, expect } from '../../fixtures';
import { PlanPage } from '../../pages/plan-page';
import { TIMEOUTS } from '../../config';

/**
 * 13 — Practice Plans for SysAdmin role.
 * SysAdmin tests run sequentially within the role.
 */
test.describe('Sysadmin Plan Tests', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ loginAs }) => {
    await loginAs('sysadmin');
  });

  // 72617: Prebuilt Plans and Org Plans tabs visible to Administrator / Owner / System Administrator
  test('@TC-72617 sysadmin sees all plan tabs', async ({ page }) => {
    const planPage = new PlanPage(page);

    await planPage.goto();

    // Sysadmin видит все вкладки
    await expect(planPage.myPlansTab, 'My Plans tab should be visible for sysadmin').toBeVisible();
    await expect(planPage.invitedTab, 'Invited tab should be visible for sysadmin').toBeVisible();
    await expect(planPage.prebuiltTab, 'Prebuilt tab should be visible for sysadmin').toBeVisible();
    await expect(planPage.orgPlansTab, 'Org Plans tab should be visible for sysadmin').toBeVisible();
  });

  // 71716: Invite multiple users to plan
  test('@TC-71716 should invite multiple users to plan', async ({ page }) => {
    const planPage = new PlanPage(page);

    await planPage.goto();
    await planPage.goToMyPlans();

    const planName = `Sysadmin Plan ${Date.now()}`;
    await planPage.clickNewPlan();
    await planPage.fillPlanForm({ name: planName });
    await planPage.addFirstDrill();
    await planPage.savePlanAndReturnToMyPlans();

    // Приглашаем пользователей
    await planPage.search(planName);
    await expect(planPage.searchInput).toHaveValue(planName);

    const planCard = planPage.getPlanCard(planName);
    await expect(planCard).toBeVisible({ timeout: TIMEOUTS.long });

    // Открываем детали плана (View на карточке — ссылка)
    await planPage.viewPlan(planName);

    // В деталях плана нажимаем Invite users
    await planPage.inviteUsers();
    await expect(planPage.inviteDialogHeading, 'Invite users dialog should open').toBeVisible({ timeout: TIMEOUTS.medium });
  });

  // 72611: Prebuilt checkbox (sys admin)
  test('@TC-72611 sysadmin can create plan with Prebuilt checkbox', async ({ page }) => {
    const planPage = new PlanPage(page);

    await planPage.goto();
    await planPage.goToMyPlans();

    const planName = `Prebuilt Plan ${Date.now()}`;
    await planPage.clickNewPlan();
    await planPage.fillPlanForm({ name: planName });
    await planPage.addFirstDrill();

    // Sysadmin видит Prebuilt checkbox в форме создания
    await expect(planPage.prebuiltCheckbox).toBeVisible({ timeout: TIMEOUTS.medium });
    await planPage.prebuiltCheckbox.check();

    await planPage.savePlanAndReturnToMyPlans();

    // План должен появиться в Prebuilt табе
    await planPage.goToPrebuilt();
    await expect(planPage.getPlanCard(planName)).toBeVisible({ timeout: TIMEOUTS.medium });
  });

  // 72614: Unchecking Prebuilt removes plan from Prebuilt tab
  test('@TC-72614 unchecking Prebuilt removes plan from Prebuilt tab', async ({ page }) => {
    const planPage = new PlanPage(page);

    await planPage.goto();
    await planPage.goToMyPlans();

    const planName = `Prebuilt Test ${Date.now()}`;
    await planPage.clickNewPlan();
    await planPage.fillPlanForm({ name: planName });
    await planPage.addFirstDrill();

    // Отмечаем Prebuilt checkbox (доступен только sysadmin)
    await planPage.prebuiltCheckbox.check();
    await planPage.savePlanAndReturnToMyPlans();

    // Проверяем что план в Prebuilt табе
    await planPage.goToPrebuilt();
    const prebuiltCard = planPage.getPlanCard(planName);
    await expect(prebuiltCard).toBeVisible({ timeout: TIMEOUTS.medium });

    // Открываем детали плана через View (View на карточке — ссылка)
    await planPage.viewPlan(planName);

    // В деталях плана нажимаем Edit
    await planPage.editPlanFromDetail();

    await planPage.prebuiltCheckbox.uncheck();
    await planPage.savePlanAndReturnToMyPlans();

    // Проверяем что план исчез из Prebuilt таба
    await planPage.goToPrebuilt();
    await expect(planPage.getPlanCard(planName)).not.toBeVisible({ timeout: TIMEOUTS.medium });
  });
});

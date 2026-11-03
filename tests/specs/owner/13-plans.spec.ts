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

  // 91859: Create Plan as Administrator / Owner
  test('@TC-91859 should create plan and see in My Plans', async ({ page }) => {
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
    await planPage.searchInput.fill(planName);
    await expect(planPage.searchInput).toHaveValue(planName);
    await expect(planPage.getPlanRow(planName)).toBeVisible({ timeout: TIMEOUTS.long });
  });

  // 91871: View Plan Owner / Admin
  test('@TC-91871 should see all plan tabs as owner', async ({ page }) => {
    const planPage = new PlanPage(page);

    await planPage.goto();

    // Проверяем вкладки
    await expect(planPage.myPlansTab).toBeVisible();
    await expect(planPage.invitedTab).toBeVisible();
    await expect(planPage.prebuiltTab).toBeVisible();
    await expect(planPage.orgPlansTab).toBeVisible();
  });

  // 91843: Non-sysadmin no Prebuilt checkbox
  test('@TC-91843 non-sysadmin roles do not see Prebuilt checkbox', async ({ page }) => {
    const planPage = new PlanPage(page);

    await planPage.goto();
    await planPage.clickNewPlan();

    // Проверяем, что чекбокса Prebuilt нет
    await expect(planPage.prebuiltCheckbox, 'Prebuilt checkbox should not be visible for non-sysadmin').not.toBeVisible();

    await planPage.cancelButton.click();
  });

  // 91890: Create plan: notes - TODO: fix drill menu button selector
  test.skip('@TC-91890 should create plan with drill notes', async ({ page }) => {
    const planPage = new PlanPage(page);

    await planPage.goto();
    await planPage.goToMyPlans();

    const planName = `Test Plan Notes ${Date.now()}`;
    await planPage.clickNewPlan();
    await planPage.fillPlanForm({ name: planName });

    // Добавляем drill
    await planPage.addDrillButton.click();
    await expect(planPage.addDrillsHeading).toBeVisible({ timeout: TIMEOUTS.medium });
    await planPage.addDrillConfirmButton.click();
    await planPage.doneButton.click();
    await expect(planPage.segmentsHeading).toBeVisible({ timeout: TIMEOUTS.short });

    // Редактируем drill - добавляем notes
    await planPage.drillMenuButton.click();
    await planPage.editDrillOption.click();
    await planPage.drillNotesInput.fill('Test drill notes');
    await planPage.drillDurationInput.fill('15');
    await planPage.drillSaveButton.click();

    // Сохраняем план
    await planPage.savePlanAndReturnToMyPlans();

    // Проверяем, что план создан
    await planPage.searchInput.fill(planName);
    await expect(planPage.searchInput).toHaveValue(planName);
    await expect(planPage.getPlanRow(planName)).toBeVisible({ timeout: TIMEOUTS.long });
  });

  // 91840: Athlete cannot edit invited plan - TODO: requires athlete role
  test.skip('@TC-91840 athlete cannot edit invited plan', async ({ page }) => {
    // Требует athlete ролью - будет в athlete/13-plans.spec.ts
  });

  // 91897: View Plan Parent - TODO: requires parent role
  test.skip('@TC-91897 parent can view plans', async ({ page }) => {
    // Требует parent ролью - будет в parent/13-plans.spec.ts
  });
});

// Tab visibility tests via factory
createPlanTabTests(test, 'owner', ROLE_TAB_EXPECTATIONS.owner);

// Sysadmin Plan Tests
test.describe('Sysadmin Plan Tests', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ loginAs }) => {
    await loginAs('sysadmin');
  });

  // 91830: Home page (System Administrator) - verify all tabs visible for Plans
  test('@TC-91830 sysadmin sees all plan tabs', async ({ page }) => {
    const planPage = new PlanPage(page);

    await planPage.goto();

    // Sysadmin видит все вкладки
    await expect(planPage.myPlansTab, 'My Plans tab should be visible for sysadmin').toBeVisible();
    await expect(planPage.invitedTab, 'Invited tab should be visible for sysadmin').toBeVisible();
    await expect(planPage.prebuiltTab, 'Prebuilt tab should be visible for sysadmin').toBeVisible();
    await expect(planPage.orgPlansTab, 'Org Plans tab should be visible for sysadmin').toBeVisible();
  });

  // 91916: Invite multiple users to plan
  test('@TC-91916 should invite multiple users to plan', async ({ page }) => {
    const planPage = new PlanPage(page);

    await planPage.goto();
    await planPage.goToMyPlans();

    const planName = `Sysadmin Plan ${Date.now()}`;
    await planPage.clickNewPlan();
    await planPage.fillPlanForm({ name: planName });
    await planPage.addFirstDrill();
    await planPage.savePlanAndReturnToMyPlans();

    // Приглашаем пользователей
    await planPage.searchInput.fill(planName);
    await expect(planPage.searchInput).toHaveValue(planName);
    
    const planCard = planPage.getPlanCard(planName);
    await expect(planCard).toBeVisible({ timeout: TIMEOUTS.long });
    
    // Нажимаем View (это ссылка, не кнопка), чтобы открыть детали плана
    const viewLink = planCard.getByRole('link', { name: 'View' });
    await expect(viewLink).toBeVisible({ timeout: TIMEOUTS.medium });
    await viewLink.click();
    
    // В деталях плана нажимаем Invite users
    await planPage.inviteUsersButton.click();
    await expect(page.getByRole('heading', { name: /Invite/i }), 'Invite users dialog should open').toBeVisible({ timeout: TIMEOUTS.medium });
  });

  // 91838: Prebuilt checkbox (sys admin)
  test('@TC-91838 sysadmin can create plan with Prebuilt checkbox', async ({ page }) => {
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

  // 91918: Unchecking Prebuilt removes plan from Prebuilt tab
  test('@TC-91918 unchecking Prebuilt removes plan from Prebuilt tab', async ({ page }) => {
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

    // Открываем детали плана через View (в Prebuilt табе View - это ссылка)
    const viewLink = prebuiltCard.getByRole('link', { name: 'View' });
    await expect(viewLink).toBeVisible({ timeout: TIMEOUTS.medium });
    await viewLink.click();

    // В деталях плана нажимаем Edit
    await planPage.editPlanFromDetail();

    await planPage.prebuiltCheckbox.uncheck();
    await planPage.savePlanAndReturnToMyPlans();

    // Проверяем что план исчез из Prebuilt таба
    await planPage.goToPrebuilt();
    await expect(planPage.getPlanCard(planName)).not.toBeVisible({ timeout: TIMEOUTS.medium });
  });
});
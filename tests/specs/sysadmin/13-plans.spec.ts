import * as allure from 'allure-js-commons';
import { test, expect } from '../../fixtures';
import type { Browser } from '@playwright/test';
import { PlanPage } from '../../pages/plan-page';
import { SignInPage } from '../../pages/sign-in-page';
import { CREDENTIALS, TIMEOUTS } from '../../config';

/**
 * Prebuilt-план публикуется для всех организаций того же вида спорта. Проверяем глазами owner (aiorg01, Lacrosse)
 * в отдельном контексте браузера: сессия sysadmin не трогается.
 */
async function expectInOwnerPrebuilt(browser: Browser, baseURL: string | undefined, planName: string, visible: boolean): Promise<void> {
  const ownerContext = await browser.newContext({ baseURL });
  try {
    const ownerTab = await ownerContext.newPage();
    const signInPage = new SignInPage(ownerTab);
    const ownerPlans = new PlanPage(ownerTab);
    await signInPage.goto();
    await signInPage.login(CREDENTIALS.owner.email, CREDENTIALS.owner.password);
    await expect(ownerPlans.navHome, 'Owner should be logged in').toBeVisible({ timeout: TIMEOUTS.long });
    await ownerPlans.goto();
    await ownerPlans.goToPrebuilt();
    await ownerPlans.search(planName);
    await expect(ownerPlans.searchInput).toHaveValue(planName);
    const card = ownerPlans.getPlanCard(planName);
    if (visible) {
      await expect(card, 'Prebuilt plan should be published to another organization').toBeVisible({ timeout: TIMEOUTS.long });
    } else {
      await expect(card, 'Unchecked plan should disappear from Prebuilt of another organization').toBeHidden({ timeout: TIMEOUTS.long });
    }
  } finally {
    await ownerContext.close();
  }
}

/**
 * 13 — Practice Plans for SysAdmin role.
 * SysAdmin tests run sequentially within the role.
 */
test.describe('Sysadmin Plan Tests', () => {
  test.describe.configure({ mode: 'serial' });

  // План создаёт только 72611, 72614 снимает Prebuilt на нём же (раньше 3 теста — 3 плана, REVIEW-PLAN 3.12)
  let prebuiltPlanName: string | undefined;

  test.beforeEach(async ({ loginAs }) => {
    await loginAs('sysadmin');
  });

  // 72617: Prebuilt Plans and Org Plans tabs visible to Administrator / Owner / System Administrator
  test('sysadmin sees all plan tabs', async ({ page }) => {
    await allure.allureId('72617');
    const planPage = new PlanPage(page);

    await planPage.goto();

    // Sysadmin видит все вкладки
    await expect(planPage.myPlansTab, 'My Plans tab should be visible for sysadmin').toBeVisible();
    await expect(planPage.invitedTab, 'Invited tab should be visible for sysadmin').toBeVisible();
    await expect(planPage.prebuiltTab, 'Prebuilt tab should be visible for sysadmin').toBeVisible();
    await expect(planPage.orgPlansTab, 'Org Plans tab should be visible for sysadmin').toBeVisible();
  });

  /**
   * TC-71716 Invite multiple user to plan by coach — тест открывал только диалог приглашения.
   * TODO(71716): кейс — роль coach (перенести в coach/13-plans, на план из 71641), выбрать сразу 5–10
   * пользователей, Send invites → уведомление «Invites saved. Emails sent: N»; письма не проверяем (AGENTS.md §10).
   * Реальные приглашения уходят пользователям стенда — нужно решение, кого приглашать.
   */
  test('should invite multiple users to plan', async () => {
    await allure.allureId('71716');
    test.skip(true, 'TODO(71716): case is for coach and needs 5-10 real invites + "Invites saved" toast; the test only opened the dialog');
  });

  // 72611: Prebuilt checkbox (sys admin) → план опубликован в Prebuilt для организаций того же спорта
  test('sysadmin can create plan with Prebuilt checkbox', async ({ page, browser, baseURL }) => {
    await allure.allureId('72611');
    const planPage = new PlanPage(page);

    await planPage.goto();
    await planPage.goToMyPlans();

    const planName = `Prebuilt Plan ${Date.now()}`;
    await planPage.clickNewPlan();
    await planPage.fillPlanForm({ name: planName });
    await planPage.addFirstDrill();

    // Sysadmin видит Prebuilt checkbox в форме создания
    await expect(planPage.prebuiltCheckbox).toBeVisible();
    await planPage.prebuiltCheckbox.check();

    await planPage.savePlanAndReturnToMyPlans();
    prebuiltPlanName = planName;

    // План в Prebuilt у sysadmin и у другой организации того же спорта (owner, Lacrosse)
    await planPage.goToPrebuilt();
    await expect(planPage.getPlanCard(planName)).toBeVisible();
    await expectInOwnerPrebuilt(browser, baseURL, planName, true);
  });

  // 72614: Unchecking Prebuilt removes plan from Prebuilt everywhere — на плане из 72611
  test('unchecking Prebuilt removes plan from Prebuilt tab', async ({ page, browser, baseURL }) => {
    await allure.allureId('72614');
    expect(prebuiltPlanName, 'Requires the Prebuilt plan created by 72611 (serial mode)').toBeDefined();
    const planName = prebuiltPlanName!;
    const planPage = new PlanPage(page);

    await planPage.goto();
    await planPage.goToPrebuilt();
    await expect(planPage.getPlanCard(planName)).toBeVisible({ timeout: TIMEOUTS.long });

    // [step 1-3] Edit → снять «Make this a Prebuilt Plan» → сохранить
    await planPage.viewPlan(planName);
    await planPage.editPlanFromDetail();
    await planPage.prebuiltCheckbox.uncheck();
    await planPage.savePlanAndReturnToMyPlans();

    // [step 4] Плана нет в Prebuilt ни у sysadmin, ни у другой организации
    await planPage.goToPrebuilt();
    await expect(planPage.getPlanCard(planName)).toBeHidden();
    await expectInOwnerPrebuilt(browser, baseURL, planName, false);
  });
});

import * as allure from 'allure-js-commons';
import { test, expect } from '../../fixtures';
import { PlanPage } from '../../pages/plan-page';
import { TIMEOUTS } from '../../config';

/**
 * 13 — Practice Plans for Coach role.
 * Coach tests run sequentially within the role.
 */
test.describe('Coach Plan Tests', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ loginAs }) => {
    await loginAs('coach');
  });

  // 71641: Create plan with drill notes and duration
  test('should create plan with drill notes and duration', async ({ page }) => {
    await allure.allureId('71641');
    const planPage = new PlanPage(page);

    // [step 1] Зайти в Plan и нажать +
    await planPage.goto();
    await planPage.clickNewPlan();

    // [step 2] Вписать имя плана
    const planName = `Coach Plan Notes ${Date.now()}`;
    await planPage.fillPlanForm({ name: planName });

    // [step 3] Нажать + и добавить drill
    await planPage.addFirstDrill();

    // [step 4] На добавленном drill нажать 3 dots → dropdown (edit, remove)
    // [step 5] Нажать remove → drill удалился
    await planPage.removeDrill();
    // Счётчик сегментов, а не просто видимость заголовка: "Segments (1)" тоже виден, если drill не удалился
    await expect(planPage.segmentsHeading, 'Drill should be removed from the plan').toHaveText(/Segments \(0\)/, { timeout: TIMEOUTS.short });

    // [step 6] Добавить drill снова
    await planPage.addFirstDrill();

    // [step 7] На добавленном drill нажать 3 dots
    // [step 8] Выбрать edit → открылся модал с edit и notes
    await planPage.editDrill({ notes: 'Test drill notes', duration: '15' });

    // [step 9] Нажать Create (сохранить изменения drill)
    await planPage.saveDrillEdit();

    // [step 10] Сохранить план и вернуться на My Plans
    await planPage.savePlanAndReturnToMyPlans();

    // [step 10.1] Notes отображается и duration сохранены
    // [step 10.2] План создан
    await planPage.search(planName);
    await expect(planPage.searchInput).toHaveValue(planName);
    await expect(planPage.getPlanCard(planName)).toBeVisible({ timeout: TIMEOUTS.long });
    // Проверяем что duration виден на карточке ЭТОГО плана (раньше искался по всей странице)
    await expect(planPage.getPlanCard(planName)).toContainText('15 min');
  });
});

import * as allure from 'allure-js-commons';
import { test, expect } from '../../fixtures';
import { ParentPage } from '../../pages/parent-page';
import { SignInPage } from '../../pages/sign-in-page';
import { HomePage } from '../../pages/home-page';
import { TIMEOUTS } from '../../config';

/**
 * 07 — Parents CRUD для Owner role.
 * Owner tests run sequentially within the role.
 */
test.describe('Owner Parent Tests', () => {
  test.describe.configure({ mode: 'serial' });

  /**
   * Родитель, созданный в первом тесте. Второй тест редактирует именно его.
   * Уникальное имя нужно, потому что поиск в таблице Parents работает только по имени, не по email.
   */
  let createdParent: { firstName: string; email: string; password: string } | undefined;

  test.beforeEach(async ({ loginAs }) => {
    await loginAs('owner');
  });

  /** @TC-71252 Create parent from add manual */
  test('should validate empty form, create parent and login as parent', async ({ page, browser, baseURL }) => {
    await allure.allureId('71252');
    const parentPage = new ParentPage(page);
    const timestamp = Date.now();
    const parent = {
      firstName: `TestParent${timestamp}`,
      email: `dtimokhin+parent${timestamp}@aexsoft.com`,
      password: '7952Qaz!',
    };

    // --- Шаг 1-3: пустая форма → валидация ---
    await parentPage.goto();
    await parentPage.clickNewParent();

    // Нажать Create без заполнения → форма должна остаться открытой
    await parentPage.clickCreateInDialog();
    await expect(parentPage.newParentHeading).toBeVisible();

    // --- Шаг 4-5: заполнить и создать ---
    await parentPage.fillParentForm({
      firstName: parent.firstName,
      lastName: 'User',
      email: parent.email,
      password: parent.password,
      confirmPassword: parent.password,
    });
    await parentPage.selectRelationship('Mother');
    await parentPage.selectAthlete('Athlete User');
    // Create → диалог закрылся → список загрузился
    await parentPage.submitNewParent();

    // Родитель в списке (search ищет по имени, не по email)
    await parentPage.search(parent.firstName);
    await expect(parentPage.getParentRow(parent.firstName)).toBeVisible({ timeout: TIMEOUTS.long });
    createdParent = parent;

    // --- Шаг 6-8: логин как созданный parent ---
    // В отдельном контексте браузера: сессия owner в основном контексте не трогается,
    // logout owner не нужен (он отзывает токен owner на сервере для всех следующих тестов).
    const parentContext = await browser.newContext({ baseURL });
    try {
      const parentTab = await parentContext.newPage();
      const signInPage = new SignInPage(parentTab);
      const parentHome = new HomePage(parentTab);

      await signInPage.goto();
      await signInPage.login(parent.email, parent.password);

      // Вошли (есть меню) и именно как parent: дашборд родителя, без карточек owner
      await expect(parentHome.navHome, 'New parent should be logged in').toBeVisible({ timeout: TIMEOUTS.long });
      await expect(parentHome.sessionSummaryHeading, 'Parent dashboard should be shown').toBeVisible({ timeout: TIMEOUTS.long });
      await expect(parentHome.totalAthletesCard, 'Owner dashboard cards should not be shown').toBeHidden();
    } finally {
      await parentContext.close();
    }
  });

  /** @TC-71256 Edit parent */
  test('should edit parent and verify changes', async ({ page }) => {
    await allure.allureId('71256');
    expect(createdParent, 'Requires the parent created by the previous test (serial mode)').toBeDefined();
    const parent = createdParent!;
    const parentPage = new ParentPage(page);

    // --- Шаг 1-2: найти созданного parent по уникальному имени ---
    await parentPage.goto();
    await parentPage.search(parent.firstName);
    await expect(parentPage.getParentRow(parent.firstName)).toBeVisible({ timeout: TIMEOUTS.long });

    // --- Шаг 3: открыть edit ---
    await parentPage.openEditParent(parent.firstName);

    // --- Шаг 4-5: отредактировать и сохранить ---
    // Новое имя тоже уникально, иначе проверка найдёт родителей, отредактированных прошлыми прогонами
    const newFirstName = `Edited${parent.firstName}`;
    await parentPage.editParent({
      firstName: newFirstName,
      lastName: 'EditedUser',
    });

    // Сохранение прошло → heading списка виден
    await expect(parentPage.heading).toBeVisible({ timeout: TIMEOUTS.long });

    // --- Шаг 6: проверить что информация обновилась ---
    await parentPage.search(newFirstName);
    await expect(parentPage.getParentRow(newFirstName)).toBeVisible({ timeout: TIMEOUTS.long });
  });
});

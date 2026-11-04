import { test, expect } from '../../fixtures';
import { ParentPage } from '../../pages/parent-page';
import { BasePage } from '../../pages/base-page';
import { SignInPage } from '../../pages/sign-in-page';
import { TIMEOUTS } from '../../config';

/**
 * 07 — Parents CRUD для Owner role.
 * Owner tests run sequentially within the role.
 */
test.describe('Owner Parent Tests', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ loginAs }) => {
    await loginAs('owner');
  });

  /** @TC-91873 Create parent from add manual */
  test('should validate empty form, create parent and login as parent', async ({ page }) => {
    const parentPage = new ParentPage(page);
    const timestamp = Date.now();
    const newParentEmail = `dtimokhin+parent${timestamp}@aexsoft.com`;

    // --- Шаг 1-3: пустая форма → валидация ---
    await parentPage.goto();
    await parentPage.clickNewParent();

    // Нажать Create без заполнения → форма должна остаться открытой
    await parentPage.clickCreateInDialog();
    await expect(parentPage.newParentHeading).toBeVisible({ timeout: TIMEOUTS.medium });

    // --- Шаг 4-5: заполнить и создать ---
    await parentPage.fillParentForm({
      firstName: 'TestParent',
      lastName: 'User',
      email: newParentEmail,
      password: '7952Qaz!',
      confirmPassword: '7952Qaz!',
    });
    await parentPage.selectRelationship('Mother');
    await parentPage.selectAthlete('Athlete User');
    // Диалог уже открыт — просто кликаем Create через PO
    await parentPage.clickCreateInDialog();

    // Родитель в списке (search ищет по имени, не по email)
    await parentPage.search('TestParent');
    await expect(parentPage.getParentRow('TestParent')).toBeVisible({ timeout: TIMEOUTS.long });

    // --- Шаг 5.2: у атлета появился родитель ---
    await parentPage.goto();
    await expect(parentPage.heading).toBeVisible({ timeout: TIMEOUTS.long });

    // --- Шаг 6-8: логин как созданный parent ---
    const basePage = new BasePage(page);
    await basePage.logout();
    const signInPage = new SignInPage(page);
    await signInPage.login(newParentEmail, '7952Qaz!');
    await expect(page).not.toHaveURL(/sign-in/, { timeout: TIMEOUTS.long });
    await expect(page.getByText('Owner')).toBeHidden({ timeout: TIMEOUTS.medium });
  });

  /** @TC-91912 Edit parent */
  test('should edit parent and verify changes', async ({ page }) => {
    const parentPage = new ParentPage(page);

    // Используем parent, созданный в TC-91873 (уникальный email)
    const parentEmail = 'dtimokhin+parent';

    // --- Шаг 1-2: найти parent по email ---
    await parentPage.goto();
    await expect(parentPage.heading).toBeVisible({ timeout: TIMEOUTS.long });
    const row = parentPage.getParentRow(parentEmail);
    await expect(row).toBeVisible({ timeout: TIMEOUTS.long });

    // --- Шаг 3: открыть edit ---
    await parentPage.openEditParent(parentEmail);

    // --- Шаг 4-5: отредактировать и сохранить ---
    const newFirstName = 'EditedParent';
    const newLastName = 'EditedUser';

    await parentPage.editParent({
      firstName: newFirstName,
      lastName: newLastName,
    });

    // Сохранение прошло → heading списка виден
    await expect(parentPage.heading).toBeVisible({ timeout: TIMEOUTS.long });

    // --- Шаг 6: проверить что информация обновилась ---
    await parentPage.search(newFirstName);
    await expect(parentPage.getParentRow(newFirstName)).toBeVisible({ timeout: TIMEOUTS.long });
  });
});

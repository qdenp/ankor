import * as allure from 'allure-js-commons';
import { test, expect } from '../../fixtures';
import { OrganizationPage } from '../../pages/organization-page';
import { CREDENTIALS, ORGANIZATIONS } from '../../config';

/**
 * 04 — Organization (пункт меню Organizations).
 * Owner tests run sequentially within the role.
 */
test.describe('Owner Organization Tests', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ loginAs }) => {
    await loginAs('owner');
  });

  /**
   * 71116 owner / admin view own organization.
   * Шаг 2 кейса (счётчики совпадают со списками) сверяется только по формату — целое число от 0:
   * решение пользователя 2026-11-23, сверка со страницами списков сильно удлиняет тест.
   * Teams в профиле считает только активные команды, а заголовок страницы Teams — все.
   */
  test('should show only own organization with sport, admin and counts', async ({ page }) => {
    await allure.allureId('71116');
    const orgPage = new OrganizationPage(page);

    await orgPage.goto();

    // [1.1] В профиле одна организация — своя
    await expect(orgPage.orgDataRows, 'Owner should see only own organization').toHaveCount(1);
    const row = orgPage.orgDataRows.first();
    await expect(orgPage.getOrgCell(row, 'name')).toHaveText(ORGANIZATIONS.owner.name);

    // [1.2] Sport, Admin (имя и email), счётчики Teams / Athletes / Coaches
    await expect(orgPage.getOrgCell(row, 'sport_name')).toHaveText(ORGANIZATIONS.owner.sport);
    await expect(orgPage.getOrgCell(row, 'owner')).toContainText(ORGANIZATIONS.owner.adminName);
    await expect(orgPage.getOrgCell(row, 'owner')).toContainText(CREDENTIALS.owner.email);
    for (const field of ['teams_count', 'athletes_count', 'coaches_count'] as const) {
      await expect(orgPage.getOrgCell(row, field), `${field} should be a non-negative integer`).toHaveText(/^\d+$/);
    }

    // [1.3] Есть кнопка Edit
    await expect(orgPage.editButton).toBeVisible();
  });

  // 71924: Edit own organization
  test('should edit organization name and revert', async ({ page }) => {
    await allure.allureId('71924');
    const orgPage = new OrganizationPage(page);

    // Возврат — к константе, а не к прочитанному имени: прогон, упавший до возврата, иначе оставлял
    // временное "Test Org …" как «исходное» для всех следующих прогонов
    const originalName = ORGANIZATIONS.owner.name;

    await orgPage.goto();
    await orgPage.clickEdit();

    // Edit organization
    const newName = `Test Org ${Date.now()}`;
    await orgPage.fillOrgForm({ name: newName });
    await orgPage.save(); // waits for profile to reload

    // Verify name changed - after save, should be back in view mode
    // Click Edit again to verify
    await orgPage.clickEdit();
    await expect(orgPage.nameInput, 'Name input should show new name after save').toHaveValue(newName);

    // Revert cleanup
    await orgPage.fillOrgForm({ name: originalName });
    await orgPage.save(); // waits for profile to reload

    // Verify reverted
    await orgPage.clickEdit();
    await expect(orgPage.nameInput, 'Name input should show original name after revert').toHaveValue(originalName);
    await orgPage.cancel(); // Exit edit mode
  });
});
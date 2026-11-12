import * as allure from 'allure-js-commons';
import { test, expect } from '../../fixtures';
import { OrganizationPage } from '../../pages/organization-page';
import { ORGANIZATIONS } from '../../config';

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
   * 71116 owner / admin view own organization — пока проверяется только, что страница открылась без редиректа на вход.
   * TODO(71116): не хватает шагов кейса — проверить данные своей организации в профиле
   * (название, вид спорта и др. по шагам кейса) и что чужие организации не видны.
   */
  test('should view organization profile', async ({ page }) => {
    await allure.allureId('71116');
    test.skip(true, 'TODO(71116): checks only that the page opens; organization profile data is not verified yet');
    const orgPage = new OrganizationPage(page);

    await orgPage.goto();

    // Проверяем, что видим профиль организации
    await expect(page, 'Should be on organization profile page, not sign-in').not.toHaveURL(/sign-in/);
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